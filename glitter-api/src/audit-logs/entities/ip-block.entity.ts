import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** An IP temporarily blocked from signing in (brute force, attacks). */
@Entity('ip_blocks')
@Index(['ip', 'blockedUntil'])
export class IpBlockEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  @Column({ type: 'timestamp', name: 'blocked_until' })
  blockedUntil!: Date;

  @Column({ type: 'varchar', length: 255 })
  reason!: string;

  /** Set when an admin lifts the block early. */
  @Column({ type: 'uuid', nullable: true, name: 'lifted_by' })
  liftedBy!: string | null;
}
