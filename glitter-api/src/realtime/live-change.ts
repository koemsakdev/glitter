import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { RealtimeService } from './realtime.service';

const LIVE_CHANGE_KEY = 'live-change-entity';

/**
 * Mark a controller (or handler) so every successful change through it
 * (POST / PUT / PATCH / DELETE) tells open dashboards and the storefront that
 * `entity` changed — e.g. variant prices, images or stock → 'products'.
 */
export const LiveChange = (entity: string) =>
  SetMetadata(LIVE_CHANGE_KEY, entity);

@Injectable()
export class LiveChangeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly realtime: RealtimeService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entity = this.reflector.getAllAndOverride<string | undefined>(
      LIVE_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const method = context
      .switchToHttp()
      .getRequest<{ method?: string }>()
      .method?.toUpperCase();
    if (!entity || !method || method === 'GET') return next.handle();
    return next.handle().pipe(tap(() => this.realtime.publish(entity)));
  }
}
