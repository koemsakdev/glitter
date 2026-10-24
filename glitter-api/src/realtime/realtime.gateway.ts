import { Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Subscription } from 'rxjs';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { RealtimeService } from './realtime.service';

const STAFF_ROLES = new Set(['cashier', 'manager', 'admin']);

/** Same origins as the REST CORS config in main.ts. */
function allowedOrigins(): (string | RegExp)[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/, ...extra];
}

/**
 * Socket.IO live channel (`/realtime` namespace). One WebSocket per browser
 * tab carries every push:
 *
 * - `change`        `{ entity, at }` to everyone — lists/pages refetch.
 * - `notification`  the new notification row, only to its recipient's room
 *                   (`user:<id>`), so staff see "New order" the moment it lands.
 *
 * Signing in is optional: the client sends its access token in the handshake
 * (`auth.token`); a valid token joins `user:<id>` (+ `staff` for staff).
 */
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: allowedOrigins(), credentials: true },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy
{
  @WebSocketServer() private server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwt: JwtService;
  private subs: Subscription[] = [];

  constructor(
    private readonly realtime: RealtimeService,
    config: ConfigService,
  ) {
    this.jwt = new JwtService({ secret: config.getOrThrow('JWT_SECRET') });
  }

  afterInit(): void {
    this.subs.push(
      this.realtime.stream$.subscribe((event) =>
        this.server.emit('change', event),
      ),
      this.realtime.direct$.subscribe(({ userIds, payload }) => {
        if (userIds.length === 0) return;
        this.server
          .to(userIds.map((id) => `user:${id}`))
          .emit('notification', payload);
      }),
    );
  }

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    const token = typeof auth?.token === 'string' ? auth.token : '';
    if (!token) return; // guest: public `change` events only
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (payload.type !== 'access') return;
      await client.join(`user:${payload.sub}`);
      if (STAFF_ROLES.has(payload.role)) await client.join('staff');
    } catch {
      // Expired/invalid token: stay connected as a guest. The client
      // reconnects with a fresh token after it refreshes its session.
      client.emit('auth_error');
    }
  }

  onModuleDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.logger.debug('Realtime gateway stopped');
  }
}
