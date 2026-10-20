import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AlertType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'sql_injection'
  | 'xss'
  | 'path_traversal'
  | 'new_country_login'
  | 'vpn_or_proxy_login'
  | 'bot_login'
  | 'suspicious_change';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Raised automatically when the system sees bad behaviour (brute force,
 * injection attempts, suspicious changes…). Can't be deleted; an admin can
 * only mark it resolved.
 */
@Entity('security_alerts')
@Index(['createdAt'])
@Index(['isResolved', 'createdAt'])
export class SecurityAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 30, name: 'alert_type' })
  alertType!: AlertType;

  @Column({ type: 'varchar', length: 10 })
  severity!: AlertSeverity;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_name' })
  userName!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_address' })
  ipAddress!: string | null;

  @Column({ type: 'text' })
  details!: string;

  /** e.g. ip_blocked_for_30_minutes | request_blocked | none */
  @Column({
    type: 'varchar',
    length: 60,
    default: 'none',
    name: 'action_taken',
  })
  actionTaken!: string;

  /** The audit / login log entry that triggered it, if any. */
  @Column({ type: 'uuid', nullable: true, name: 'related_log_id' })
  relatedLogId!: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_resolved' })
  isResolved!: boolean;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by' })
  resolvedBy!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'resolved_by_name',
  })
  resolvedByName!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'resolved_at' })
  resolvedAt!: Date | null;
}
