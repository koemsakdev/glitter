import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('badges')
export class BadgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Stable slug stored on product_badges.badge_type. */
  @Index({ unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: 50 })
  slug!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_en' })
  nameEn!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_km' })
  nameKm!: string;

  @Column({ type: 'varchar', length: 9 })
  color!: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Soft delete: "deleting" stamps this instead of erasing the row, so the
   * record and its history stay traceable. Normal queries skip these rows.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
