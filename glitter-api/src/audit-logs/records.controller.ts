import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ModuleRef } from '@nestjs/core';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, Not } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RealtimeService } from '../realtime/realtime.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/user.service';
import { AuditLogService, LABELS } from './audit-log.service';
import {
  REALTIME,
  recycleBinRetentionDays,
  SOFT_DELETABLE,
} from './recycle-bin';

/**
 * Per-record audit tools (admin): a record's full trail, the recycle bin of
 * soft-deleted records, and restore. The bin empties itself after the
 * retention period (RecycleBinRetentionService) — no manual hard delete.
 */
@ApiTags('Audit logs')
@ApiBearerAuth()
@Controller('records')
@UseGuards(RolesGuard)
@Roles('admin')
export class RecordsController {
  constructor(
    private readonly audit: AuditLogService,
    @InjectDataSource() private readonly db: DataSource,
    private readonly realtime: RealtimeService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /** Users have their own delete/restore rules (identifiers, sign-ins). */
  private get users(): UsersService {
    return this.moduleRef.get(UsersService, { strict: false });
  }

  @Get(':entity/:id/trail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Audit trail of one record (who, what, when, where)',
  })
  async trail(@Param('entity') entity: string, @Param('id') id: string) {
    return { data: await this.audit.recordTrail(entity, id) };
  }

  @Get('deleted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recycle bin: soft-deleted records (admin)' })
  async deleted(
    @Query('entity') entity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const types = entity ? [entity] : SOFT_DELETABLE;
    if (types.some((t) => !SOFT_DELETABLE.includes(t))) {
      throw new BadRequestException('Unknown record type');
    }
    const rows: {
      entity: string;
      id: string;
      label: string | null;
      deletedAt: Date;
    }[] = [];
    for (const t of types) {
      const cfg = LABELS[t];
      const found = (await this.db.getRepository(cfg.target).find({
        where: { deletedAt: Not(IsNull()) } as never,
        withDeleted: true,
        order: { deletedAt: 'DESC' } as never,
        take: 200,
      })) as Record<string, unknown>[];
      for (const r of found) {
        rows.push({
          entity: t,
          id: String(r.id),
          label: (r[cfg.field] as string | null) ?? null,
          deletedAt: r.deletedAt as Date,
        });
      }
    }
    rows.sort((a, b) => +new Date(b.deletedAt) - +new Date(a.deletedAt));
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const slice = rows.slice((p - 1) * l, p * l);
    // Who deleted each one (from the append-only trail).
    const deleters = await this.audit.lastActors(
      slice.map((r) => ({ entity: r.entity, id: r.id })),
      'delete',
    );
    return {
      data: slice.map((r) => ({
        ...r,
        deletedBy: deleters.get(`${r.entity}:${r.id}`) ?? null,
      })),
      total: rows.length,
      page: p,
      limit: l,
      /** Days a record stays here before it is deleted automatically. */
      retentionDays: recycleBinRetentionDays(),
    };
  }

  @Patch(':entity/:id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted record (admin)' })
  async restore(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @CurrentUser() admin: UserEntity,
  ) {
    if (!SOFT_DELETABLE.includes(entity)) {
      throw new BadRequestException('This record type cannot be restored');
    }
    if (entity === 'users') {
      const user = await this.db
        .getRepository(UserEntity)
        .findOne({ where: { id } });
      if (!user) throw new NotFoundException('Record not found');
      const { conflicts } = await this.users.restoreDeleted(id);
      void this.audit.record({
        actor: admin,
        action: 'restore',
        entity,
        entityId: id,
        label: user.fullName,
        changes: {
          old_value: { accountStatus: 'deleted' },
          new_value: { accountStatus: 'active' },
        },
        method: 'PATCH',
        path: `/api/records/${entity}/:id/restore`,
      });
      return { ok: true, conflicts };
    }
    const repo = this.db.getRepository(LABELS[entity].target);
    const row = (await repo.findOne({
      where: { id } as never,
      withDeleted: true,
    })) as Record<string, unknown> | null;
    if (!row) throw new NotFoundException('Record not found');
    if (!row.deletedAt) return { ok: true };
    try {
      await repo.restore(id);
    } catch {
      throw new BadRequestException(
        'Cannot restore: another active record already uses the same code / SKU / slug. Rename or delete that one first.',
      );
    }
    void this.audit.record({
      actor: admin,
      action: 'restore',
      entity,
      entityId: id,
      label: (row[LABELS[entity].field] as string | null) ?? null,
      changes: {
        old_value: { deletedAt: (row.deletedAt as Date).toISOString() },
        new_value: { deletedAt: null },
      },
      method: 'PATCH',
      path: `/api/records/${entity}/:id/restore`,
    });
    if (REALTIME[entity]) this.realtime.publish(REALTIME[entity]);
    return { ok: true };
  }
}
