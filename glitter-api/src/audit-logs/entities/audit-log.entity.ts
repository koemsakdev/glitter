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
  | 'other';

/**
 * One staff action in the dashboard — who did what, to which record, when.
 * Written automatically by AuditInterceptor (and on staff login); read-only
 * for admins via GET /api/audit-logs. Rows are never edited.
 */
@Entity('audit_logs')
@Index(['createdAt'])
@Index(['actorId', 'createdAt'])
@Index(['entity', 'entityId'])
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

  @Column({ type: 'varchar', length: 8 })
  method!: string;

  @Column({ type: 'varchar', length: 255 })
  path!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;
}
