import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogController } from './audit-log.controller';
import { RecordsController } from './records.controller';
import { AuditLogService } from './audit-log.service';
import { AuditInterceptor } from './audit.interceptor';
import { AuditLogEntity } from './entities/audit-log.entity';
import { IpBlockEntity } from './entities/ip-block.entity';
import { LoginAttemptEntity } from './entities/login-attempt.entity';
import { SecurityAlertEntity } from './entities/security-alert.entity';
import { AuditIntegrityService } from './security/audit-integrity.service';
import { LoginSecurityService } from './security/login-security.service';
import { ThreatMiddleware } from './security/threat.middleware';
import { ThreatService } from './security/threat.service';

/**
 * Security & audit: change history (append-only), sign-in log, security
 * alerts and IP blocking. Global so auth can record sign-ins.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditLogEntity,
      LoginAttemptEntity,
      SecurityAlertEntity,
      IpBlockEntity,
    ]),
  ],
  controllers: [AuditLogController, RecordsController],
  providers: [
    AuditLogService,
    LoginSecurityService,
    ThreatService,
    AuditIntegrityService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditLogService, LoginSecurityService, ThreatService],
})
export class AuditLogModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Screen every request for attacks and blocked IPs.
    consumer.apply(ThreatMiddleware).forRoutes('*');
  }
}
