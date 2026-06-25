import { Controller, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { interval, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Public } from '../auth/decorators/public.decorator';
import { RealtimeService } from './realtime.service';

@ApiTags('Realtime')
@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  /**
   * Server-Sent Events stream. Clients connect with the browser's native
   * EventSource and receive `{ entity, at }` whenever something changes.
   */
  @Public()
  @Sse('events')
  @ApiOperation({ summary: 'Realtime change stream (SSE)' })
  events(): Observable<{ data: string }> {
    const changes$ = this.realtime.stream$.pipe(
      map((event) => ({ data: JSON.stringify(event) })),
    );
    // Heartbeat every 25s so proxies/browsers don't close the idle stream.
    const heartbeat$ = interval(25000).pipe(
      map(() => ({
        data: JSON.stringify({ entity: '__ping__', at: Date.now() }),
      })),
    );
    return merge(changes$, heartbeat$);
  }
}
