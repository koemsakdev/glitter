import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export type BranchStatus = 'active' | 'inactive' | 'closed';

@Entity('branches')
@Index('idx_branch_code', ['branchCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  branchCode!: string;

  @Column({ type: 'varchar' })
  branchNameEn!: string;

  @Column({ type: 'varchar' })
  branchNameKm!: string;

  @Column({ type: 'varchar' })
  streetAddress!: string;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'varchar' })
  phoneNumber!: string;

  @Column({ type: 'varchar' })
  email!: string;

  @Column({ type: 'double precision' })
  latitude!: number;

  @Column({ type: 'double precision' })
  longitude!: number;

  @Column({ type: 'text', nullable: true })
  openingHours!: string | null;

  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'closed'],
    default: 'active',
  })
  branchStatus!: BranchStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  /**
   * Soft delete: "deleting" stamps this instead of erasing the row, so the
   * record and its history stay traceable. Normal queries skip these rows.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
