import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface RealtimeEvent {
  /** What changed, e.g. 'store-config' | 'menu' | 'orders'. */
  entity: string;
  at: number;
}

/**
 * In-memory event bus. Services call `publish(entity)` after a mutation and
 * the SSE endpoint streams it to every connected dashboard / storefront client.
 */
@Injectable()
export class RealtimeService {
  private readonly subject = new Subject<RealtimeEvent>();
  readonly stream$ = this.subject.asObservable();

  publish(entity: string): void {
    this.subject.next({ entity, at: Date.now() });
  }
}
