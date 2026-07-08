import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrdersService } from './orders.service';

/**
 * Periodically releases the stock held by abandoned pay-first (KHQR) orders.
 *
 * A self-managed interval (no external scheduler dependency): every minute it
 * asks the orders service to cancel unpaid KHQR orders whose hold window has
 * lapsed, which returns their reserved units to available stock.
 */
@Injectable()
export class OrdersExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersExpiryService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /** How often to sweep for expired holds. */
  private static readonly INTERVAL_MS = 60_000;

  constructor(private readonly orders: OrdersService) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.sweep();
    }, OrdersExpiryService.INTERVAL_MS);
    // Don't keep the event loop alive just for this timer.
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async sweep(): Promise<void> {
    if (this.running) return; // never overlap sweeps
    this.running = true;
    try {
      const cancelled = await this.orders.expireStalePrepaidOrders();
      if (cancelled > 0) {
        this.logger.log(
          `Released stock for ${cancelled} expired unpaid KHQR order(s).`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to expire stale prepaid orders', err as Error);
    } finally {
      this.running = false;
    }
  }
}
