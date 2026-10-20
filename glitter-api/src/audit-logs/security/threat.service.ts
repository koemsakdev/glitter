import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { IpBlockEntity } from '../entities/ip-block.entity';
import { LoginAttemptEntity } from '../entities/login-attempt.entity';
import {
  AlertSeverity,
  AlertType,
  SecurityAlertEntity,
} from '../entities/security-alert.entity';

/** Brute force: this many failures from one IP in the window → block. */
const BRUTE_FORCE_FAILS = 5;
const BRUTE_FORCE_WINDOW_MIN = 5;
const BLOCK_MINUTES = 30;

/** Request patterns that are attacks, never legitimate shop data. */
const THREATS: {
  type: 'SQL_INJECTION' | 'XSS' | 'PATH_TRAVERSAL';
  re: RegExp;
}[] = [
  { type: 'SQL_INJECTION', re: /'\s*(or|and)\s+['"\d\w]+\s*=\s*['"\d\w]+/i },
  { type: 'SQL_INJECTION', re: /\bunion\b[\s\S]{0,20}\bselect\b/i },
  {
    type: 'SQL_INJECTION',
    re: /;\s*(drop|delete|truncate|alter|update|insert)\s+(table|from|into)?\s*\w/i,
  },
  { type: 'SQL_INJECTION', re: /'\s*;?\s*--/ },
  {
    type: 'SQL_INJECTION',
    re: /\b(pg_sleep|sleep|benchmark|waitfor\s+delay)\s*\(/i,
  },
  { type: 'SQL_INJECTION', re: /\binformation_schema\b|\bpg_catalog\b/i },
  { type: 'XSS', re: /<\s*script\b|<\s*\/\s*script\s*>/i },
  { type: 'XSS', re: /\bjavascript\s*:/i },
  { type: 'XSS', re: /<[^>]+\son\w+\s*=/i },
  { type: 'XSS', re: /<\s*(iframe|object|embed|svg)\b[^>]*\bon\w+/i },
  { type: 'PATH_TRAVERSAL', re: /(\.\.[/\\]){2,}|\/etc\/passwd|%2e%2e%2f/i },
];

/** Never scanned (users may legitimately type anything in a password). */
const SKIP_KEYS = /password|token|secret|credential|signature|hash/i;

@Injectable()
export class ThreatService {
  private readonly logger = new Logger(ThreatService.name);
  private blockCache = new Map<string, { until: number; checkedAt: number }>();

  constructor(
    @InjectRepository(SecurityAlertEntity)
    private readonly alerts: Repository<SecurityAlertEntity>,
    @InjectRepository(IpBlockEntity)
    private readonly blocks: Repository<IpBlockEntity>,
    @InjectRepository(LoginAttemptEntity)
    private readonly logins: Repository<LoginAttemptEntity>,
  ) {}

  // ---------------------------------------------------------------- alerts

  async raiseAlert(a: {
    type: AlertType;
    severity: AlertSeverity;
    details: string;
    ip?: string | null;
    userId?: string | null;
    userName?: string | null;
    actionTaken?: string;
    relatedLogId?: string | null;
    /** Skip if the same open alert (type + ip/user) exists within N minutes. */
    dedupeMinutes?: number;
  }): Promise<void> {
    try {
      if (a.dedupeMinutes) {
        const dup = await this.alerts.findOne({
          where: {
            alertType: a.type,
            isResolved: false,
            ...(a.ip ? { ipAddress: a.ip } : {}),
            ...(a.userId ? { userId: a.userId } : {}),
            createdAt: MoreThan(
              new Date(Date.now() - a.dedupeMinutes * 60_000),
            ),
          },
        });
        if (dup) return;
      }
      await this.alerts.insert({
        alertType: a.type,
        severity: a.severity,
        details: a.details.slice(0, 2000),
        ipAddress: a.ip ?? null,
        userId: a.userId ?? null,
        userName: a.userName ?? null,
        actionTaken: a.actionTaken ?? 'none',
        relatedLogId: a.relatedLogId ?? null,
      });
    } catch (err) {
      this.logger.warn(`Could not raise alert: ${String(err)}`);
    }
  }

  // ---------------------------------------------------------- ip blocking

  /** Minutes left on a block for this IP, or 0 if not blocked. */
  async blockedFor(ip: string): Promise<number> {
    const now = Date.now();
    const hit = this.blockCache.get(ip);
    if (hit && now - hit.checkedAt < 15_000) {
      return hit.until > now ? Math.ceil((hit.until - now) / 60_000) : 0;
    }
    const row = await this.blocks.findOne({
      where: { ip, blockedUntil: MoreThan(new Date()) },
      order: { blockedUntil: 'DESC' },
    });
    const until = row && !row.liftedBy ? row.blockedUntil.getTime() : 0;
    this.blockCache.set(ip, { until, checkedAt: now });
    return until > now ? Math.ceil((until - now) / 60_000) : 0;
  }

  async blockIp(ip: string, minutes: number, reason: string): Promise<void> {
    const until = new Date(Date.now() + minutes * 60_000);
    await this.blocks.insert({
      ip,
      blockedUntil: until,
      reason,
      liftedBy: null,
    });
    this.blockCache.set(ip, { until: until.getTime(), checkedAt: Date.now() });
  }

  async liftBlock(ip: string, adminId: string): Promise<void> {
    await this.blocks.update(
      { ip, blockedUntil: MoreThan(new Date()) },
      { liftedBy: adminId },
    );
    this.blockCache.delete(ip);
  }

  async activeBlocks() {
    const rows = await this.blocks.find({
      where: { blockedUntil: MoreThan(new Date()) },
      order: { createdAt: 'DESC' },
    });
    return rows.filter((r) => !r.liftedBy);
  }

  // --------------------------------------------------- failed sign-in rules

  /** Failures for this username or IP in the last 15 min (incl. current). */
  async recentFailures(ip: string, username: string): Promise<number> {
    const rows = await this.logins.query<{ n: string }[]>(
      `SELECT COUNT(*) n FROM login_attempts
        WHERE success = false AND created_at >= now() - interval '15 minutes'
          AND (ip = $1 OR username_tried = $2)`,
      [ip, username],
    );
    return Number(rows[0]?.n ?? 0);
  }

  /** After a failed sign-in: brute force → block IP; stuffing → alert. */
  async afterFailedLogin(
    ip: string,
    username: string,
    user: { id: string; fullName: string } | null,
  ): Promise<void> {
    const [byIp] = await this.logins.query<{ n: string }[]>(
      `SELECT COUNT(*) n FROM login_attempts
        WHERE success = false AND ip = $1
          AND created_at >= now() - ($2 || ' minutes')::interval`,
      [ip, String(BRUTE_FORCE_WINDOW_MIN)],
    );
    if (
      Number(byIp?.n ?? 0) >= BRUTE_FORCE_FAILS &&
      !(await this.blockedFor(ip))
    ) {
      await this.blockIp(ip, BLOCK_MINUTES, 'brute_force');
      await this.raiseAlert({
        type: 'brute_force',
        severity: 'high',
        ip,
        userId: user?.id,
        userName: user?.fullName ?? username,
        details: `${byIp.n} failed sign-ins within ${BRUTE_FORCE_WINDOW_MIN} minutes (last username tried: "${username}")`,
        actionTaken: `ip_blocked_for_${BLOCK_MINUTES}_minutes`,
      });
    }

    // Same account attacked from several IPs = credential stuffing.
    const [byUser] = await this.logins.query<{ ips: string }[]>(
      `SELECT COUNT(DISTINCT ip) ips FROM login_attempts
        WHERE success = false AND username_tried = $1
          AND created_at >= now() - interval '15 minutes'`,
      [username],
    );
    if (Number(byUser?.ips ?? 0) >= 3) {
      await this.raiseAlert({
        type: 'credential_stuffing',
        severity: 'high',
        userId: user?.id,
        userName: user?.fullName ?? username,
        details: `Username "${username}" failed from ${byUser.ips} different IPs within 15 minutes`,
        dedupeMinutes: 15,
      });
    }
  }

  // ------------------------------------------------------ attack patterns

  /** First attack pattern found anywhere in the request, if any. */
  detect(input: unknown): {
    type: 'SQL_INJECTION' | 'XSS' | 'PATH_TRAVERSAL';
    field: string;
    value: string;
  } | null {
    const seen = new Set<unknown>();
    const walk = (
      v: unknown,
      key: string,
      depth: number,
    ): ReturnType<ThreatService['detect']> => {
      if (depth > 6 || v === null || v === undefined || seen.has(v))
        return null;
      if (typeof v === 'string') {
        if (SKIP_KEYS.test(key)) return null;
        const decoded = safeDecode(v);
        for (const t of THREATS) {
          if (t.re.test(decoded))
            return { type: t.type, field: key, value: v.slice(0, 200) };
        }
        return null;
      }
      if (typeof v === 'object') {
        seen.add(v);
        for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
          const hit = walk(child, k, depth + 1);
          if (hit) return hit;
        }
      }
      return null;
    };
    return walk(input, '', 0);
  }
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Payload text for the log with secrets masked. */
export function maskPayload(body: unknown, query: unknown): string {
  const mask = (v: unknown): unknown => {
    if (!v || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(mask);
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, x]) => [
        k,
        SKIP_KEYS.test(k) ? '***' : mask(x),
      ]),
    );
  };
  return JSON.stringify({ body: mask(body), query: mask(query) }).slice(
    0,
    2000,
  );
}

/**
 * Rules for changes that deserve a second look. Returns a reason or null.
 * `changes` holds only the changed fields.
 */
export function suspiciousChange(
  entity: string,
  action: string,
  changes: {
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
  } | null,
  label: string | null,
): { reason: string; severity: AlertSeverity } | null {
  const o = changes?.old_value ?? {};
  const n = changes?.new_value ?? {};
  const name = label ? `"${label}"` : 'a record';

  for (const field of ['price', 'priceOverride']) {
    const before = Number(o[field]);
    const after = Number(n[field]);
    if (field in n && before > 0 && after >= 0 && after < before) {
      const drop = Math.round(((before - after) / before) * 100);
      if (drop >= 50) {
        return {
          reason: `Price of ${name} reduced by ${drop}% (${before} → ${after}) — possible fraud`,
          severity: drop >= 80 ? 'high' : 'medium',
        };
      }
    }
  }
  if (
    entity === 'users' &&
    n.role === 'admin' &&
    o.role &&
    o.role !== 'admin'
  ) {
    return { reason: `${name} was promoted to admin`, severity: 'high' };
  }
  if (
    entity === 'users' &&
    n.accountStatus === 'active' &&
    o.accountStatus === 'suspended'
  ) {
    return {
      reason: `Suspended account ${name} was re-activated`,
      severity: 'medium',
    };
  }
  if (entity === 'inventory') {
    const before = Number(o.quantityAvailable);
    const after = Number(n.quantityAvailable);
    if ('quantityAvailable' in n && before - after >= 50) {
      return {
        reason: `Stock reduced by ${before - after} units in one change (${before} → ${after})`,
        severity: 'medium',
      };
    }
  }
  if (entity === 'vouchers') {
    const v = Number(n.discountValue ?? n.value);
    if (
      (n.discountType === 'percent' || o.discountType === 'percent') &&
      v >= 50
    ) {
      return {
        reason: `Promotion ${name} set to ${v}% off`,
        severity: 'medium',
      };
    }
  }
  if (
    action === 'delete' &&
    ['products', 'users', 'branches', 'categories', 'brands'].includes(entity)
  ) {
    return {
      reason: `${entity.replace(/s$/, '')} ${name} was permanently deleted`,
      severity: 'medium',
    };
  }
  if (action === 'status' && n.status === 'refunded') {
    return { reason: `Order ${name} was refunded`, severity: 'low' };
  }
  return null;
}
