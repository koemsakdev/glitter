import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export type CategoryType = 'main' | 'sub' | 'featured';

@Entity('categories')
@Index('idx_category_slug', ['slug'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CategoryEntity {
  @PrimaryGeneratedColumn('uuid')
  declare id: string;

  @Column({ type: 'varchar', length: 100 })
  declare slug: string;

  @Column({ type: 'varchar', length: 150 })
  declare nameEn: string;

  @Column({ type: 'varchar', length: 150 })
  declare nameKm: string;

  @Column({ type: 'text', nullable: true })
  declare descriptionEn: string | null;

  @Column({ type: 'text', nullable: true })
  declare descriptionKm: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  declare iconUrl: string | null;

  @Column({ type: 'integer', default: 0 })
  declare displayOrder: number;

  @Column({
    type: 'enum',
    enum: ['main', 'sub', 'featured'],
    default: 'main',
  })
  declare categoryType: CategoryType;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  declare createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  declare updatedAt: Date;

  /**
   * Soft delete: "deleting" stamps this instead of erasing the row, so the
   * record and its history stay traceable. Normal queries skip these rows.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
