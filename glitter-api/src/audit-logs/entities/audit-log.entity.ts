import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status'
  | 'stock'
  | 'login'
  | 'logout'
  | 'login_failed'
  | 'password'
  | 'blocked_request'
  | 'restore'
  | 'purge'
  | 'other';

/**
 * One staff action in the dashboard — who did what, to which record, when.
 * Written automatically by AuditInterceptor (and on staff login); read-only
 * for admins via GET /api/audit-logs. APPEND-ONLY: a database trigger
 * rejects any UPDATE or DELETE, even from an admin (see AuditIntegrity).
 */
@Entity('audit_logs')
@Index(['createdAt'])
@Index(['actorId', 'createdAt'])
@Index(['entity', 'entityId'])
@Index(['isSuspicious', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /** Who did it (snapshot, so the log survives renames/deletions). */
  @Column({ type: 'uuid', nullable: true, name: 'actor_id' })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 255, name: 'actor_name' })
  actorName!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'actor_username',
  })
  actorUsername!: string | null;

  @Column({ type: 'varchar', length: 20, name: 'actor_role' })
  actorRole!: string;

  @Column({ type: 'uuid', nullable: true, name: 'actor_branch_id' })
  actorBranchId!: string | null;

  @Column({ type: 'varchar', length: 20 })
  action!: AuditAction;

  /** What kind of record, e.g. 'products', 'orders', 'users'. */
  @Column({ type: 'varchar', length: 50 })
  entity!: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'entity_id' })
  entityId!: string | null;

  /** Human label of the record at the time, e.g. product name / order no. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  /** Extra context: changed field names, new status, quantities… */
  @Column({ type: 'jsonb', nullable: true })
  details!: Record<string, unknown> | null;

  /** Area of the system: catalog, sales, inventory, users, settings, auth… */
  @Column({ type: 'varchar', length: 30, default: 'other' })
  module!: string;

  /** success | failed (request rejected/errored) | blocked (attack) */
  @Column({ type: 'varchar', length: 10, default: 'success' })
  status!: 'success' | 'failed' | 'blocked';

  @Column({ type: 'int', nullable: true, name: 'response_status' })
  responseStatus!: number | null;

  /** What changed: { old_value: {...}, new_value: {...} } (changed fields). */
  @Column({ type: 'jsonb', nullable: true })
  changes!: {
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
  } | null;

  @Column({ type: 'boolean', default: false, name: 'is_suspicious' })
  isSuspicious!: boolean;

  @Column({ type: 'text', nullable: true, name: 'suspicious_reason' })
  suspiciousReason!: string | null;

  /** SQL_INJECTION | XSS | PATH_TRAVERSAL (blocked requests) */
  @Column({ type: 'varchar', length: 30, nullable: true, name: 'threat_type' })
  threatType!: string | null;

  /** Request payload for blocked attacks (passwords masked, truncated). */
  @Column({ type: 'text', nullable: true })
  payload!: string | null;

  @Column({ type: 'varchar', length: 8 })
  method!: string;

  @Column({ type: 'varchar', length: 255 })
  path!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;
}
