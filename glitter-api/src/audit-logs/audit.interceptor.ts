import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { from, Observable, of, switchMap, tap } from 'rxjs';
import type { UserEntity } from '../users/entities/user.entity';
import { AuditLogService } from './audit-log.service';
import type { AuditAction } from './entities/audit-log.entity';

/** Route groups that aren't business actions (or are customers'). */
const SKIP = new Set([
  'auth',
  'account',
  'notifications',
  'realtime',
  'ai',
  'uploads',
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
  constructor(private readonly audit: AuditLogService) {}

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
            ip: clientIp(req),
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

    // Deletes: read the name BEFORE it's gone.
    const preLabel$ =
      method === 'DELETE' || productPart
        ? from(this.audit.lookupLabel(entity, preId))
        : of(null);

    return preLabel$.pipe(
      switchMap((preLabel) =>
        next.handle().pipe(
          tap((res: unknown) => {
            const data =
              (res as { data?: Record<string, unknown> } | null)?.data ??
              (res as Record<string, unknown> | null) ??
              {};
            const entityId =
              preId ?? (typeof data.id === 'string' ? data.id : null) ?? null;
            const quick =
              preLabel ??
              pickLabel(data) ??
              (method === 'POST' ? pickLabel(body) : null);
            const ip = clientIp(req);
            void (async () => {
              const label =
                quick ?? (await this.audit.lookupLabel(entity, entityId));
              await this.audit.record({
                actor: user,
                action,
                entity,
                entityId,
                label,
                details: Object.keys(details).length ? details : null,
                method,
                path: routePath,
                ip,
              });
            })();
          }),
        ),
      ),
    );
  }
}

function clientIp(req: Req): string | undefined {
  return (
    (req.headers['x-forwarded-for'] as string | undefined)
      ?.split(',')[0]
      ?.trim() ?? req.ip
  );
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
