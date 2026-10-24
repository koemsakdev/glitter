import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { clientIp as resolveClientIp } from '../../audit-logs/security/client-info';

type Req = {
  method: string;
  originalUrl?: string;
  url: string;
  user?: { id?: string; username?: string | null; role?: string };
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

/**
 * Logs every failed request as one ECS line with the exact reason, then lets
 * Nest send its normal error response.
 *   5xx         → error (with stack trace)
 *   400/403/409/422… → warn (the validation / business reason)
 *   401 / 404   → debug (expired tokens & stray URLs are everyday noise)
 */
@Catch()
export class HttpErrorLogFilter extends BaseExceptionFilter {
  private readonly logger = new Logger('HttpError');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() === 'http') {
      const req = host.switchToHttp().getRequest<Req>();
      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const body =
        exception instanceof HttpException ? exception.getResponse() : null;
      const raw =
        body && typeof body === 'object'
          ? (body as { message?: unknown }).message
          : body;
      const reason = Array.isArray(raw)
        ? raw.join('; ')
        : typeof raw === 'string'
          ? raw
          : exception instanceof Error
            ? exception.message
            : 'Unknown error';
      const code =
        body && typeof body === 'object'
          ? (body as { code?: string }).code
          : undefined;

      const doc = {
        message: `${req.method} ${(req.originalUrl ?? req.url).split('?')[0]} → ${status}: ${reason}`,
        event: {
          kind: 'event',
          category: ['web'],
          action: 'http.request',
          outcome: 'failure',
          reason,
          ...(code ? { code } : {}),
        },
        http: {
          request: { method: req.method },
          response: { status_code: status },
        },
        url: { path: (req.originalUrl ?? req.url).split('?')[0] },
        client: { ip: resolveClientIp(req as never).ip },
        ...(req.user?.id
          ? {
              user: {
                id: req.user.id,
                name: req.user.username ?? undefined,
                roles: req.user.role ? [req.user.role] : undefined,
              },
            }
          : {}),
        ...(status >= 500 ? { error: exception } : {}),
      };

      if (status >= 500) this.logger.error(doc);
      else if (status === 401 || status === 404) this.logger.debug(doc);
      else this.logger.warn(doc);
    }
    super.catch(exception, host);
  }
}
