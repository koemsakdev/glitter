import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
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
  ) {}

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
  ) {
    return this.logins.list({
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
  ) {
    return this.service.findAll({
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
