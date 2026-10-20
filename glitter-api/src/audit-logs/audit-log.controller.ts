import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { SecurityAlertEntity } from './entities/security-alert.entity';
import { ThreatService } from './security/threat.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLogService } from './audit-log.service';
import { LoginSecurityService } from './security/login-security.service';

@ApiTags('Audit logs')
@ApiBearerAuth()
@Controller('audit-logs')
@UseGuards(RolesGuard)
@Roles('admin')
export class AuditLogController {
  constructor(
    private readonly service: AuditLogService,
    private readonly logins: LoginSecurityService,
    private readonly threats: ThreatService,
    @InjectRepository(SecurityAlertEntity)
    private readonly alerts: Repository<SecurityAlertEntity>,
  ) {}

  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Security alerts (admin)' })
  async listAlerts(
    @Query('resolved') resolved?: string,
    @Query('severity') severity?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page) || 1);
    const l = Math.min(100, Math.max(1, Number(limit) || 20));
    const qb = this.alerts
      .createQueryBuilder('a')
      .orderBy('a.createdAt', 'DESC');
    if (resolved === 'true' || resolved === 'false') {
      qb.andWhere('a.isResolved = :r', { r: resolved === 'true' });
    }
    if (severity) qb.andWhere('a.severity = :s', { s: severity });
    const [data, total] = await qb
      .skip((p - 1) * l)
      .take(l)
      .getManyAndCount();
    const open = await this.alerts.count({ where: { isResolved: false } });
    return { data, total, page: p, limit: l, open };
  }

  @Patch('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a security alert resolved (admin)' })
  async resolveAlert(
    @Param('id') id: string,
    @CurrentUser() admin: UserEntity,
  ) {
    await this.alerts.update(id, {
      isResolved: true,
      resolvedBy: admin.id,
      resolvedByName: admin.fullName,
      resolvedAt: new Date(),
    });
    return { ok: true };
  }

  @Get('blocks')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Currently blocked IPs (admin)' })
  async blocks() {
    return { data: await this.threats.activeBlocks() };
  }

  @Patch('blocks/:ip/lift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lift an IP block early (admin)' })
  async lift(@Param('ip') ip: string, @CurrentUser() admin: UserEntity) {
    await this.threats.liftBlock(ip, admin.id);
    return { ok: true };
  }

  @Get('logins')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dashboard sign-in attempts with IP, location and device (admin)',
  })
  async loginAttempts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('success') success?: string,
    @Query('search') search?: string,
    @Query('ip') ip?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.logins.list({
      sortBy,
      sortOrder,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      success,
      search,
      ip,
    });
  }

  @Get('logins/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign-in security summary for the last 24h' })
  async loginSummary() {
    return { data: await this.logins.summary() };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activity log — who did what in the dashboard (admin only)',
  })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('actorId') actorId?: string,
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('suspicious') suspicious?: string,
    @Query('module') module?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.service.findAll({
      sortBy,
      sortOrder,
      status,
      suspicious,
      module,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      actorId,
      entity,
      entityId,
      action,
      from,
      to,
      search,
    });
  }
}
