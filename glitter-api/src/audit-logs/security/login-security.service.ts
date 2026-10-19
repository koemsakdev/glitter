import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoginAttemptEntity } from '../entities/login-attempt.entity';
import {
  clientIp,
  isPrivateIp,
  parseUserAgent,
  type ReqLike,
} from './client-info';

interface Geo {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  ipTimezone: string | null;
}

/** Records every dashboard sign-in attempt with network, place and device. */
@Injectable()
export class LoginSecurityService {
  private readonly logger = new Logger(LoginSecurityService.name);
  /** Small in-memory cache so repeated attempts don't re-query the IP. */
  private readonly geoCache = new Map<
    string,
    { at: number; geo: Geo | null }
  >();

  constructor(
    @InjectRepository(LoginAttemptEntity)
    private readonly repo: Repository<LoginAttemptEntity>,
  ) {}

  /** Save the attempt now; look up the IP's location in the background. */
  async record(
    req: ReqLike,
    attempt: {
      success: boolean;
      failureReason?: string | null;
      usernameTried: string;
      user?: { id: string; fullName: string; role: string } | null;
      clientInfo?: Record<string, unknown> | null;
    },
  ): Promise<void> {
    try {
      const { ip, chain } = clientIp(req);
      const uaRaw = req.headers['user-agent'];
      const ua = (Array.isArray(uaRaw) ? uaRaw[0] : uaRaw)?.slice(0, 1000);
      const device = parseUserAgent(ua);
      const row = await this.repo.save(
        this.repo.create({
          success: attempt.success,
          failureReason: attempt.failureReason ?? null,
          usernameTried: attempt.usernameTried.slice(0, 255),
          userId: attempt.user?.id ?? null,
          userName: attempt.user?.fullName ?? null,
          userRole: attempt.user?.role ?? null,
          ip,
          forwardedFor: chain,
          userAgent: ua ?? null,
          browser: device.browser,
          os: device.os,
          deviceType: device.deviceType,
          clientInfo: sanitizeClientInfo(attempt.clientInfo),
        }),
      );
      void this.fillLocation(row.id, ip);
    } catch (err) {
      this.logger.warn(`Could not record login attempt: ${String(err)}`);
    }
  }

  private async fillLocation(id: string, ip: string): Promise<void> {
    if (isPrivateIp(ip)) {
      await this.repo.update(id, { country: 'Local network', city: null });
      return;
    }
    const geo = await this.lookup(ip);
    if (geo) await this.repo.update(id, geo);
  }

  /** IP → place via ipwho.is (free, HTTPS, no key). Cached for 6 hours. */
  private async lookup(ip: string): Promise<Geo | null> {
    const hit = this.geoCache.get(ip);
    if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.geo;
    let geo: Geo | null = null;
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        signal: AbortSignal.timeout(5000),
      });
      const d = (await res.json()) as {
        success?: boolean;
        country?: string;
        country_code?: string;
        region?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        connection?: { isp?: string; org?: string };
        timezone?: { id?: string };
      };
      if (d.success) {
        geo = {
          country: d.country ?? null,
          countryCode: d.country_code ?? null,
          region: d.region ?? null,
          city: d.city ?? null,
          latitude: d.latitude ?? null,
          longitude: d.longitude ?? null,
          isp: d.connection?.isp ?? d.connection?.org ?? null,
          ipTimezone: d.timezone?.id ?? null,
        };
      }
    } catch {
      // Location is best-effort; the attempt itself is already saved.
    }
    if (this.geoCache.size > 2000) this.geoCache.clear();
    this.geoCache.set(ip, { at: Date.now(), geo });
    return geo;
  }

  async list(q: {
    page?: number;
    limit?: number;
    success?: string;
    search?: string;
    ip?: string;
  }) {
    const page = Math.max(1, q.page ?? 1);
    const limit = Math.min(100, Math.max(1, q.limit ?? 20));
    const qb = this.repo.createQueryBuilder('l').orderBy('l.createdAt', 'DESC');
    if (q.success === 'true' || q.success === 'false') {
      qb.andWhere('l.success = :s', { s: q.success === 'true' });
    }
    if (q.ip) qb.andWhere('l.ip = :ip', { ip: q.ip });
    const term = q.search?.trim();
    if (term) {
      qb.andWhere(
        '(l.usernameTried ILIKE :t OR l.userName ILIKE :t OR l.ip ILIKE :t OR l.country ILIKE :t OR l.city ILIKE :t)',
        { t: `%${term}%` },
      );
    }
    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total, page, limit };
  }

  /** Headline numbers + the IPs with the most failures (last 24h). */
  async summary() {
    const since = new Date(Date.now() - 24 * 3600_000);
    const [counts, topIps, newPlaces] = await Promise.all([
      this.repo.query<{ success: boolean; n: string; ips: string }[]>(
        `SELECT success, COUNT(*) n, COUNT(DISTINCT ip) ips
           FROM login_attempts WHERE created_at >= $1 GROUP BY success`,
        [since],
      ),
      this.repo.query<
        {
          ip: string;
          n: string;
          country: string | null;
          city: string | null;
          last: Date;
          usernames: string;
        }[]
      >(
        `SELECT ip, COUNT(*) n, MAX(country) country, MAX(city) city,
                MAX(created_at) last,
                string_agg(DISTINCT username_tried, ', ') usernames
           FROM login_attempts
          WHERE created_at >= $1 AND success = false
          GROUP BY ip ORDER BY n DESC LIMIT 5`,
        [since],
      ),
      // Successful sign-ins from a country that account never used before.
      this.repo.query<
        {
          user_name: string;
          country: string;
          city: string | null;
          created_at: Date;
        }[]
      >(
        `SELECT l.user_name, l.country, l.city, l.created_at
           FROM login_attempts l
          WHERE l.success AND l.created_at >= $1 AND l.country IS NOT NULL
            AND l.country <> 'Local network'
            AND NOT EXISTS (
              SELECT 1 FROM login_attempts p
               WHERE p.user_id = l.user_id AND p.success
                 AND p.country = l.country AND p.created_at < l.created_at - interval '1 second')
            AND EXISTS (
              SELECT 1 FROM login_attempts p2
               WHERE p2.user_id = l.user_id AND p2.success AND p2.created_at < l.created_at)
          ORDER BY l.created_at DESC LIMIT 5`,
        [since],
      ),
    ]);
    const ok = counts.find((c) => c.success);
    const bad = counts.find((c) => !c.success);
    return {
      last24h: {
        successful: Number(ok?.n ?? 0),
        failed: Number(bad?.n ?? 0),
        failedIps: Number(bad?.ips ?? 0),
      },
      topFailingIps: topIps.map((r) => ({
        ip: r.ip,
        attempts: Number(r.n),
        country: r.country,
        city: r.city,
        last: r.last,
        usernames: r.usernames,
      })),
      newCountrySignIns: newPlaces.map((r) => ({
        userName: r.user_name,
        country: r.country,
        city: r.city,
        at: r.created_at,
      })),
    };
  }
}

/** Keep only small, known fields from what the browser reported. */
function sanitizeClientInfo(
  info: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!info || typeof info !== 'object') return null;
  const out: Record<string, unknown> = {};
  for (const k of [
    'timezone',
    'language',
    'languages',
    'screen',
    'viewport',
    'platform',
    'touch',
    'colorDepth',
    'deviceMemory',
    'cores',
  ]) {
    const v = info[k];
    if (v === undefined || v === null) continue;
    out[k] =
      typeof v === 'string'
        ? v.slice(0, 120)
        : Array.isArray(v)
          ? v.slice(0, 5).map((x) => JSON.stringify(x).slice(0, 20))
          : typeof v === 'number' || typeof v === 'boolean'
            ? v
            : JSON.stringify(v).slice(0, 120);
  }
  return Object.keys(out).length ? out : null;
}
