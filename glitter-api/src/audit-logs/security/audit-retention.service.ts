import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { auditRetentionDays } from './retention';

const FIRST_RUN_MS = 60_000; // a minute after start-up
const EVERY_MS = 12 * 60 * 60_000; // then twice a day
const BATCH = 5_000;

/**
 * Hard-deletes activity-log / audit-trail rows and sign-in attempts older
 * than the retention period (default 90 days).
 *
 * Rows written by the seed (`method = 'SEED'`) are kept: they are the
 * "created by" record for catalog data that still exists, and deleting them
 * would leave those items without an origin in their audit trail.
 *
 * The append-only trigger (AuditIntegrityService) still rejects every edit
 * and any delete of a row younger than the retention period.
 */
@Injectable()
export class AuditRetentionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AuditRetentionService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  onApplicationBootstrap(): void {
    this.timers.push(
      setTimeout(() => void this.purge(), FIRST_RUN_MS),
      setInterval(() => void this.purge(), EVERY_MS),
    );
  }

  onModuleDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
  }

  /** Delete expired rows in batches. Returns how many were removed. */
  async purge(): Promise<{ auditLogs: number; loginAttempts: number }> {
    if (this.running) return { auditLogs: 0, loginAttempts: 0 };
    this.running = true;
    const days = auditRetentionDays();
    try {
      const auditLogs = await this.deleteInBatches(
        `DELETE FROM audit_logs WHERE id IN (
           SELECT id FROM audit_logs
           WHERE created_at < now() - make_interval(days => $1)
             AND method IS DISTINCT FROM 'SEED'
           LIMIT ${BATCH})`,
        days,
      );
      const loginAttempts = await this.deleteInBatches(
        `DELETE FROM login_attempts WHERE id IN (
           SELECT id FROM login_attempts
           WHERE created_at < now() - make_interval(days => $1)
           LIMIT ${BATCH})`,
        days,
      );
      if (auditLogs || loginAttempts) {
        this.logger.log(
          `Retention (${days} days): removed ${auditLogs} activity-log and ${loginAttempts} sign-in rows`,
        );
      }
      return { auditLogs, loginAttempts };
    } catch (err) {
      this.logger.error(`Retention cleanup failed: ${String(err)}`);
      return { auditLogs: 0, loginAttempts: 0 };
    } finally {
      this.running = false;
    }
  }

  private async deleteInBatches(sql: string, days: number): Promise<number> {
    let total = 0;
    for (;;) {
      // TypeORM's raw DELETE result is [rows, affectedCount] on Postgres.
      const res: unknown = await this.db.query(sql, [days]);
      const removed = Array.isArray(res) ? Number(res[1] ?? 0) : 0;
      total += removed;
      if (removed < BATCH) return total;
    }
  }
}
