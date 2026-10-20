import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AuditLogService } from '../audit-log.service';
import { clientIp } from './client-info';
import { LoginSecurityService } from './login-security.service';
import { maskPayload, ThreatService } from './threat.service';

/** Sign-in endpoints that a blocked IP may not use. */
const LOGIN_PATHS = new Set([
  '/api/auth/staff/login',
  '/api/auth/login',
  '/api/auth/google',
]);

/**
 * Runs before every API request:
 *  1. Blocked IPs can't reach the sign-in endpoints (429).
 *  2. Requests carrying attack patterns (SQL injection, XSS, path traversal)
 *     are rejected (403), logged with the masked payload, alerted, and the
 *     IP is blocked.
 */
@Injectable()
export class ThreatMiddleware implements NestMiddleware {
  constructor(
    private readonly threats: ThreatService,
    private readonly audit: AuditLogService,
    private readonly logins: LoginSecurityService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const path = req.originalUrl.split('?')[0];
    if (!path.startsWith('/api/')) return next();
    const { ip } = clientIp(req);
    const body = req.body as Record<string, unknown> | undefined;

    try {
      if (req.method === 'POST' && LOGIN_PATHS.has(path)) {
        const minutes = await this.threats.blockedFor(ip);
        if (minutes > 0) {
          if (path === '/api/auth/staff/login') {
            const tried = str(body?.username).trim().toLowerCase();
            void this.logins.record(req, {
              success: false,
              status: 'blocked',
              failureReason: 'ip_blocked',
              usernameTried: tried || '(none)',
              clientInfo: body?.client as Record<string, unknown> | undefined,
            });
          }
          res.status(429).json({
            statusCode: 429,
            message: `Too many failed attempts from your network. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
          });
          return;
        }
      }

      const hit =
        this.threats.detect(req.query) ??
        this.threats.detect(body) ??
        this.threats.detect({ path: decodeURIComponent(path) });
      if (hit) {
        const username = str(body?.username ?? body?.email).slice(0, 100);
        const logId = await this.audit.record({
          actor: { id: null, fullName: username || 'unknown', role: 'unknown' },
          action: 'blocked_request',
          entity: 'security',
          module: path.includes('/auth/') ? 'authentication' : 'security',
          label: `${hit.type.replace('_', ' ')} attempt on ${path}`,
          status: 'blocked',
          responseStatus: 403,
          isSuspicious: true,
          suspiciousReason: `${hit.type.replace('_', ' ')} pattern detected in "${hit.field || 'request'}"`,
          threatType: hit.type,
          payload: maskPayload(body, req.query),
          method: req.method,
          path,
          ip,
        });
        await this.threats.blockIp(ip, 30, hit.type.toLowerCase());
        await this.threats.raiseAlert({
          type: hit.type.toLowerCase() as
            | 'sql_injection'
            | 'xss'
            | 'path_traversal',
          severity: 'critical',
          ip,
          userName: username || null,
          details: `${hit.type.replace('_', ' ')} attempt on ${req.method} ${path} — field "${hit.field || 'request'}": ${hit.value}`,
          actionTaken: 'request_blocked_ip_blocked_for_30_minutes',
          relatedLogId: logId,
        });
        res.status(403).json({ statusCode: 403, message: 'Request blocked' });
        return;
      }
    } catch {
      // Security checks must never take the API down; fall through.
    }
    next();
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
