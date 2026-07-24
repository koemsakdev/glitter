import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { AbaPaywayService } from './aba-payway.service';

/**
 * Reconciles pay-first (KHQR) holds against ABA — the source of truth for
 * whether a transaction was actually paid.
 *
 * Why this exists: the storefront only polls ABA while the QR is on screen. If
 * the customer paid but that poll missed it (network drop, ABA confirmed late,
 * or they closed the page), a purely time-based sweep would wrongly expire a
 * PAID order — money taken, no order. So each sweep we:
 *
 *  1. Ask ABA for each open hold's real status; APPROVED → confirm it (which
 *     reserves stock + notifies). A hold is only expired once its window has
 *     lapsed AND ABA still reports it unpaid — never on a timer alone.
 *  2. Re-check recently-expired holds for a short grace window, so a payment
 *     that settled just after expiry is still honoured (expired → paid revival).
 *
 * PERFORMANCE — this is a *backup* path, so it must not hammer the DB when
 * nothing is happening (the common case). Instead of a fixed 60s loop it
 * self-paces: it polls FAST (60s) only while there's actually a hold to watch,
 * and drops to a SLOW idle heartbeat (10 min) when there's nothing pending.
 * That idle heartbeat is a single lightweight query — and with idle periods
 * this long, serverless Postgres (Neon) is free to suspend between them. The
 * config (hold window / ABA enabled) is cached so we don't re-read settings
 * every sweep. No external scheduler dependency.
 */
@Injectable()
export class AbaReconciliationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AbaReconciliationService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  /** Poll cadence while a KHQR hold is pending / recently expired. */
  private static readonly FAST_MS = 60_000;
  /** Idle heartbeat when there's nothing to reconcile — lets Neon sleep. */
  private static readonly IDLE_MS = 10 * 60_000;
  /** First sweep shortly after boot (catches holds created before a restart). */
  private static readonly BOOT_MS = 5_000;
  /** How long after expiry a late ABA settlement can still revive an order. */
  private static readonly EXPIRED_GRACE_MS = 30 * 60_000; // 30 minutes
  /** How long a cached config value is trusted before re-reading settings. */
  private static readonly CONFIG_TTL_MS = 10 * 60_000;

  // Cached config so we don't hit the DB / ABA for these on every sweep.
  private cachedHoldMs = 0;
  private cachedEnabled = false;
  private configAt = 0;

  constructor(
    private readonly aba: AbaPaywayService,
    private readonly orders: OrdersService,
  ) {}

  onModuleInit(): void {
    this.scheduleNext(AbaReconciliationService.BOOT_MS);
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNext(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => void this.tick(), delayMs);
    // Don't keep the event loop alive just for this timer.
    this.timer.unref?.();
  }

  /** Run one sweep, then schedule the next at fast/idle cadence based on it. */
  private async tick(): Promise<void> {
    let hasWork = false;
    try {
      hasWork = await this.sweep();
    } finally {
      this.scheduleNext(
        hasWork
          ? AbaReconciliationService.FAST_MS
          : AbaReconciliationService.IDLE_MS,
      );
    }
  }

  /** Load hold window + ABA-enabled, re-reading at most once per TTL. */
  private async getConfig(): Promise<{ holdMs: number; enabled: boolean }> {
    if (Date.now() - this.configAt > AbaReconciliationService.CONFIG_TTL_MS) {
      this.cachedHoldMs = (await this.orders.getPrepaidHoldMinutes()) * 60_000;
      this.cachedEnabled = await this.aba.isEnabled();
      this.configAt = Date.now();
    }
    return { holdMs: this.cachedHoldMs, enabled: this.cachedEnabled };
  }

  /**
   * @returns whether there was anything to watch (open or recently-expired
   * holds) — the caller uses this to pick the fast vs idle next cadence.
   */
  private async sweep(): Promise<boolean> {
    if (this.running) return false; // never overlap sweeps
    this.running = true;
    try {
      // 1) Open holds — confirm if ABA says paid, else expire once lapsed.
      const holds = await this.orders.listOpenPrepaidHolds();

      // Nothing pending: skip the config read + ABA calls entirely and idle.
      if (holds.length === 0) {
        const late = await this.orders.listRecentlyExpiredHolds(
          AbaReconciliationService.EXPIRED_GRACE_MS,
        );
        if (late.length === 0) return false; // → idle heartbeat

        const { enabled } = await this.getConfig();
        if (enabled) await this.reviveLatePayments(late);
        return true; // stay fast while a late settlement could still land
      }

      const { holdMs, enabled } = await this.getConfig();
      let confirmed = 0;
      let expired = 0;
      for (const h of holds) {
        try {
          if (enabled && h.abaTranId) {
            const status = await this.aba.checkTransaction(h.abaTranId);
            if (status === 'APPROVED') {
              await this.orders.confirmAbaPayment(h.abaTranId);
              confirmed += 1;
              continue;
            }
          }
          // Only expire once the hold window has fully lapsed. (With ABA off we
          // can't verify, so this is a plain time-based fallback.)
          if (Date.now() - h.createdAt.getTime() >= holdMs) {
            await this.orders.expireHold(h.id);
            expired += 1;
          }
        } catch {
          // Network hiccup or a concurrent confirmation — retry next sweep.
        }
      }

      // 2) Grace: a payment that settled just after expiry still counts.
      if (enabled) {
        const late = await this.orders.listRecentlyExpiredHolds(
          AbaReconciliationService.EXPIRED_GRACE_MS,
        );
        confirmed += await this.reviveLatePayments(late);
      }

      if (confirmed > 0 || expired > 0) {
        this.logger.log(
          `ABA reconcile: confirmed ${confirmed}, expired ${expired} hold(s).`,
        );
      }
      return true; // holds existed → keep polling fast
    } catch (err) {
      this.logTransient(err);
      // On error, assume there may still be work → retry soon (fast cadence).
      return true;
    } finally {
      this.running = false;
    }
  }

  /** Confirm any recently-expired holds that ABA now reports as paid. */
  private async reviveLatePayments(
    late: { abaTranId: string | null }[],
  ): Promise<number> {
    let confirmed = 0;
    for (const e of late) {
      if (!e.abaTranId) continue;
      try {
        const status = await this.aba.checkTransaction(e.abaTranId);
        if (status === 'APPROVED') {
          await this.orders.confirmAbaPayment(e.abaTranId);
          confirmed += 1;
        }
      } catch {
        // retry next sweep
      }
    }
    return confirmed;
  }

  /** A transient DB / ABA connectivity blip just means "retry next sweep". */
  private logTransient(err: unknown): void {
    const code = (err as { code?: string })?.code ?? '';
    const message = err instanceof Error ? err.message : String(err);
    const transient =
      /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|Connection terminated|timeout/i.test(
        `${code} ${message}`,
      );
    if (transient) {
      this.logger.warn(
        `ABA reconciliation skipped — service unreachable (${code || 'network'}); will retry next sweep.`,
      );
    } else {
      this.logger.error('ABA reconciliation sweep failed', err as Error);
    }
  }
}
