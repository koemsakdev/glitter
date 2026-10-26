import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThan } from 'typeorm';
import { RealtimeService } from '../realtime/realtime.service';
import { UsersService } from '../users/user.service';
import { AuditLogService, LABELS } from './audit-log.service';
import { PURGE_ORDER, REALTIME, recycleBinRetentionDays } from './recycle-bin';

const FIRST_RUN_MS = 90_000; // a minute and a half after start-up
const EVERY_MS = 12 * 60 * 60_000; // then twice a day
const BATCH = 500;
const SYSTEM = { id: null, fullName: 'System (auto clean-up)', role: 'system' };

/**
 * Empties the recycle bin automatically: anything deleted more than the
 * retention period ago (default 90 days) is removed for good, so the
 * database doesn't keep growing. There is no manual "delete permanently".
 *
 * A record still used by live data (e.g. a category with active products,
 * a branch with orders) is skipped and tried again on the next run.
 */
@Injectable()
export class RecycleBinRetentionService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(RecycleBinRetentionService.name);
  private timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly audit: AuditLogService,
    private readonly realtime: RealtimeService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap(): void {
    this.timers.push(
      setTimeout(() => void this.purgeExpired(), FIRST_RUN_MS),
      setInterval(() => void this.purgeExpired(), EVERY_MS),
    );
  }

  onModuleDestroy(): void {
    this.timers.forEach((t) => clearTimeout(t));
  }

  async purgeExpired(): Promise<{ removed: number; kept: number }> {
    if (this.running) return { removed: 0, kept: 0 };
    this.running = true;
    const days = recycleBinRetentionDays();
    const cutoff = new Date(Date.now() - days * 86_400_000);
    let removed = 0;
    let kept = 0;
    const touched = new Set<string>();
    try {
      for (const entity of PURGE_ORDER) {
        const cfg = LABELS[entity];
        if (!cfg) continue;
        const repo = this.db.getRepository(cfg.target);
        const rows = (await repo.find({
          // Rows still live have deletedAt = null, which never matches.
          where: { deletedAt: LessThan(cutoff) } as never,
          withDeleted: true,
          take: BATCH,
        })) as Record<string, unknown>[];

        for (const row of rows) {
          const id = String(row.id);
          try {
            if (entity === 'users') {
              await this.moduleRef
                .get(UsersService, { strict: false })
                .purge(id);
            } else {
              await repo.delete(id);
            }
            removed += 1;
            if (REALTIME[entity]) touched.add(REALTIME[entity]);
            void this.audit.record({
              actor: SYSTEM,
              action: 'purge',
              entity,
              entityId: id,
              label: (row[cfg.field] as string | null) ?? null,
              details: { reason: `In the recycle bin for over ${days} days` },
              method: 'SYSTEM',
              path: 'recycle-bin/auto-clean',
            });
          } catch (err) {
            // Still referenced by live data — keep it, try again next run.
            kept += 1;
            this.logger.debug(
              `Kept ${entity} ${id} in the recycle bin: ${String(err)}`,
            );
          }
        }
      }
      touched.forEach((e) => this.realtime.publish(e));
      if (removed || kept) {
        this.logger.log(
          `Recycle bin clean-up (${days} days): removed ${removed}, kept ${kept} still in use`,
        );
      }
      return { removed, kept };
    } catch (err) {
      this.logger.error(`Recycle bin clean-up failed: ${String(err)}`);
      return { removed, kept };
    } finally {
      this.running = false;
    }
  }
}
