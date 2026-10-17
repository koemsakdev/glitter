import { Injectable, Logger } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface RealtimeEvent {
  /** What changed, e.g. 'store-config' | 'menu' | 'orders'. */
  entity: string;
  at: number;
}

/**
 * In-memory event bus. Services call `publish(entity)` after a mutation and
 * the SSE endpoint streams it to every connected dashboard / storefront client.
 *
 * It also tells the storefront SERVER (when STORE_REVALIDATE_URL is set) so
 * its cached data is expired even if no shopper has the store open — e.g. a
 * product deleted in the dashboard disappears from the home page at once.
 */
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly subject = new Subject<RealtimeEvent>();
  readonly stream$ = this.subject.asObservable();

  private pending = new Set<string>();
  private flushTimer: NodeJS.Timeout | null = null;

  publish(entity: string): void {
    this.subject.next({ entity, at: Date.now() });
    this.queueStoreRevalidate(entity);
  }

  /** Batch a burst of events (one save can emit several) into one call. */
  private queueStoreRevalidate(entity: string): void {
    if (!process.env.STORE_REVALIDATE_URL) return;
    this.pending.add(entity);
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => void this.flushStoreRevalidate(), 300);
  }

  private async flushStoreRevalidate(): Promise<void> {
    const events = [...this.pending];
    this.pending.clear();
    this.flushTimer = null;
    try {
      const res = await fetch(process.env.STORE_REVALIDATE_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidate-secret': process.env.STORE_REVALIDATE_SECRET ?? '',
        },
        body: JSON.stringify({ events }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(`Store revalidate failed: HTTP ${res.status}`);
      }
    } catch (err) {
      // Best-effort: the store's own timed cache still catches up.
      this.logger.warn(`Store revalidate unreachable: ${String(err)}`);
    }
  }
}
