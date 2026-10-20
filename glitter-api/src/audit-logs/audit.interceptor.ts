import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, from, Observable, switchMap, tap, throwError } from 'rxjs';
import type { UserEntity } from '../users/entities/user.entity';
import { AuditLogService, diff } from './audit-log.service';
import { clientIp as resolveClientIp } from './security/client-info';
import { suspiciousChange, ThreatService } from './security/threat.service';
import type { AuditAction } from './entities/audit-log.entity';

/** Route groups that aren't business actions (or are customers'). */
const SKIP = new Set([
  'auth',
  'account',
  'notifications',
  'realtime',
  'ai',
  'uploads',
  // restores are logged by RecordsController itself
  'records',
]);

/** Product parts are logged against their product ("updated images of X"). */
const PRODUCT_PARTS: Record<string, string> = {
  'product-images': 'images',
  'product-badges': 'badges',
  'related-products': 'related products',
  'product-variants': 'variants',
};

const ENTITY_ALIAS: Record<string, string> = {
  'inventory-branch': 'inventory',
};

/** Never store these values in the log. */
const SECRET_FIELDS = /password|token|secret/i;

/** The client's real IP (proxy-aware, spoof-resistant). */
function realIp(req: Req): string {
  return resolveClientIp(req).ip;
}

type Req = {
  method: string;
  route?: { path?: string };
  path: string;
  params: Record<string, string>;
  body: Record<string, unknown> | undefined;
  user?: UserEntity;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
};

/**
 * Records every create/update/delete made by STAFF in the dashboard
 * (who, what, which record, when) — the admin's Activity Log. Logging happens
 * after the action succeeds and never blocks or fails it.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditLogService,
    private readonly threats: ThreatService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Req>();
    const method = req.method.toUpperCase();
    const user = req.user;
    if (
      !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ||
      !user ||
      user.role === 'customer'
    ) {
      return next.handle();
    }

    const routePath = req.route?.path ?? req.path;
    const parts = routePath.replace(/^\/?api\//, '').split('/');
    const seg = parts[0] ?? '';

    // From the auth group, only sign-out and password changes are actions
    // worth auditing (sign-in success/failure is logged by AuthService).
    if (
      seg === 'auth' &&
      (parts[1] === 'logout' || parts[1] === 'change-password')
    ) {
      const isLogout = parts[1] === 'logout';
      return next.handle().pipe(
        tap(() => {
          void this.audit.record({
            actor: user,
            action: isLogout ? 'logout' : 'password',
            entity: 'auth',
            entityId: user.id,
            label: isLogout ? 'Signed out' : 'Changed own password',
            method,
            path: routePath,
            ip: realIp(req),
          });
        }),
      );
    }
    if (SKIP.has(seg)) return next.handle();

    const body = req.body ?? {};
    const productPart = PRODUCT_PARTS[seg];
    const entity = productPart ? 'products' : (ENTITY_ALIAS[seg] ?? seg);
    const paramId = req.params.id ?? req.params.productId;
    const preId = productPart
      ? (req.params.productId ?? (body.productId as string | undefined))
      : paramId;

    const action: AuditAction = productPart
      ? 'update'
      : entity === 'inventory'
        ? 'stock'
        : /(^|\/)(status|payment-status)$/.test(routePath)
          ? 'status'
          : method === 'DELETE'
            ? 'delete'
            : method === 'POST'
              ? 'create'
              : 'update';

    const details: Record<string, unknown> = {};
    if (productPart) details.part = productPart;
    if (action === 'status') {
      details.status = body.status ?? body.paymentStatus;
    } else if (action === 'stock') {
      for (const k of [
        'branchId',
        'quantityAvailable',
        'quantity',
        'fromBranchId',
        'toBranchId',
        'productVariantId',
      ]) {
        if (body[k] !== undefined) details[k] = body[k];
      }
      details.operation =
        parts[1] && !parts[1].startsWith(':') ? parts[1] : method;
    } else if (action === 'update' && !productPart) {
      const fields = Object.keys(body).map((k) =>
        SECRET_FIELDS.test(k) ? 'password' : k,
      );
      if (/\/password$/.test(routePath)) fields.push('password');
      if (fields.length) details.fields = [...new Set(fields)];
    }

    const isStock = entity === 'inventory';
    const ip = realIp(req);

    // BEFORE: old values (updates/deletes/stock) and the name (deletes).
    const before$ = from(
      (async () => {
        if (isStock) {
          const inv = await this.audit.inventorySnapshot(
            body.productVariantId,
            body.branchId,
          );
          return {
            values: inv?.values ?? null,
            label: inv?.sku ?? null,
            id: inv?.id || null,
          };
        }
        if (method === 'POST' || productPart) {
          return {
            values: null,
            label: productPart
              ? await this.audit.lookupLabel(entity, preId)
              : null,
            id: null,
          };
        }
        const values = await this.audit.snapshot(entity, preId);
        return {
          values,
          label:
            method === 'DELETE'
              ? await this.audit.lookupLabel(entity, preId)
              : null,
          id: null,
        };
      })().catch(() => ({ values: null, label: null, id: null })),
    );

    return before$.pipe(
      switchMap((pre) =>
        next.handle().pipe(
          tap((res: unknown) => {
            const data =
              (res as { data?: Record<string, unknown> } | null)?.data ??
              (res as Record<string, unknown> | null) ??
              {};
            const entityId =
              preId ??
              pre.id ??
              (typeof data.id === 'string' ? data.id : null) ??
              null;
            const quick =
              pre.label ??
              pickLabel(data) ??
              (method === 'POST' ? pickLabel(body) : null);
            const status =
              ctx.switchToHttp().getResponse<{ statusCode?: number }>()
                .statusCode ?? 200;
            void (async () => {
              const label =
                quick ?? (await this.audit.lookupLabel(entity, entityId));
              // AFTER: new values (not for deletes), then keep only what changed.
              let after: Record<string, unknown> | null = null;
              if (method !== 'DELETE' && !productPart) {
                after = isStock
                  ? ((
                      await this.audit.inventorySnapshot(
                        body.productVariantId,
                        body.branchId,
                      )
                    )?.values ?? null)
                  : await this.audit.snapshot(entity, entityId);
                if (!after && method === 'POST') after = plainBody(body);
              }
              const changes = productPart
                ? { old_value: null, new_value: plainBody(body) }
                : diff(pre.values, after);
              const flag = suspiciousChange(entity, action, changes, label);
              const logId = await this.audit.record({
                actor: user,
                action,
                entity,
                entityId,
                label,
                details: Object.keys(details).length ? details : null,
                changes,
                status: 'success',
                responseStatus: status,
                isSuspicious: Boolean(flag),
                suspiciousReason: flag?.reason ?? null,
                method,
                path: routePath,
                ip,
              });
              if (flag && flag.severity !== 'low') {
                await this.threats.raiseAlert({
                  type: 'suspicious_change',
                  severity: flag.severity,
                  ip,
                  userId: user.id,
                  userName: user.fullName,
                  details: `${user.fullName} (${user.role}): ${flag.reason}`,
                  relatedLogId: logId,
                });
              }
            })();
          }),
          // Rejected / failed actions are part of the trail too.
          catchError((err: unknown) => {
            const code =
              (err as { getStatus?: () => number }).getStatus?.() ?? 500;
            const message =
              (err as { message?: string }).message?.slice(0, 300) ?? null;
            void this.audit.record({
              actor: user,
              action,
              entity,
              entityId: preId ?? null,
              label: pre.label,
              details: { ...details, error: message },
              status: 'failed',
              responseStatus: code,
              // Being refused access (403) is worth a second look.
              isSuspicious: code === 403,
              suspiciousReason:
                code === 403
                  ? `Tried an action not allowed for role "${user.role}"`
                  : null,
              method,
              path: routePath,
              ip,
            });
            return throwError(() => err);
          }),
        ),
      ),
    );
  }
}

/** Request body as plain loggable values (secrets masked). */
function plainBody(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (SECRET_FIELDS.test(k)) out[k] = '***';
    else if (v === null || ['string', 'number', 'boolean'].includes(typeof v))
      out[k] = v;
    else if (Array.isArray(v)) out[k] = `[${v.length} item(s)]`;
  }
  return Object.keys(out).length ? out : null;
}

function pickLabel(o: Record<string, unknown>): string | null {
  for (const k of [
    'settingKey',
    'title',
    'nameEn',
    'name',
    'orderNumber',
    'fullName',
    'branchNameEn',
    'titleEn',
    'labelEn',
    'code',
    'variantSku',
    'username',
  ]) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}
