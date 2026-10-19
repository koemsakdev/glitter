import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogEntity } from './entities/audit-log.entity';
import { LoginAttemptEntity } from './entities/login-attempt.entity';
import { LoginSecurityService } from './security/login-security.service';

/** Activity log: records staff actions app-wide (global interceptor). */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AuditLogEntity, LoginAttemptEntity])],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    LoginSecurityService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditLogService, LoginSecurityService],
})
export class AuditLogModule {}
