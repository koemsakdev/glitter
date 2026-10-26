import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { auditRetentionDays } from './retention';

/**
 * Database-level protection for the security trail (runs on startup,
 * idempotent):
 *  - audit_logs: APPEND-ONLY — any UPDATE or TRUNCATE is rejected, for every
 *    user including admins and direct database access. DELETE is rejected
 *    too, except for rows older than the retention period (default 90 days),
 *    which AuditRetentionService removes automatically.
 *  - security_alerts: can't be deleted; only the "resolved" fields may change.
 */
@Injectable()
export class AuditIntegrityService implements OnModuleInit {
  private readonly logger = new Logger(AuditIntegrityService.name);

  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onModuleInit(): Promise<void> {
    // Integer from config — safe to inline into the trigger body.
    const days = auditRetentionDays();
    try {
      await this.db.query(`
        CREATE OR REPLACE FUNCTION glitter_audit_append_only() RETURNS trigger AS $$
        BEGIN
          -- Retention: only rows past the keep period may be deleted.
          IF TG_OP = 'DELETE'
             AND OLD.created_at < now() - interval '${days} days' THEN
            RETURN OLD;
          END IF;
          RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP;
        END; $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
        CREATE TRIGGER audit_logs_append_only
          BEFORE UPDATE OR DELETE ON audit_logs
          FOR EACH ROW EXECUTE FUNCTION glitter_audit_append_only();

        DROP TRIGGER IF EXISTS audit_logs_no_truncate ON audit_logs;
        CREATE TRIGGER audit_logs_no_truncate
          BEFORE TRUNCATE ON audit_logs
          FOR EACH STATEMENT EXECUTE FUNCTION glitter_audit_append_only();

        CREATE OR REPLACE FUNCTION glitter_alerts_guard() RETURNS trigger AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN
            RAISE EXCEPTION 'security_alerts cannot be deleted';
          END IF;
          IF (NEW.alert_type, NEW.severity, NEW.details, NEW.ip_address, NEW.user_id,
              NEW.action_taken, NEW.created_at)
             IS DISTINCT FROM
             (OLD.alert_type, OLD.severity, OLD.details, OLD.ip_address, OLD.user_id,
              OLD.action_taken, OLD.created_at) THEN
            RAISE EXCEPTION 'security_alerts: only the resolved fields can change';
          END IF;
          RETURN NEW;
        END; $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS security_alerts_guard ON security_alerts;
        CREATE TRIGGER security_alerts_guard
          BEFORE UPDATE OR DELETE ON security_alerts
          FOR EACH ROW EXECUTE FUNCTION glitter_alerts_guard();
      `);
      this.logger.log(
        `Audit trail protection active (append-only, ${days}-day retention).`,
      );
    } catch (err) {
      this.logger.error(`Could not install audit protection: ${String(err)}`);
    }
  }
}
