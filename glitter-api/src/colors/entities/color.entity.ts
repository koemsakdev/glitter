import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

@Entity('colors')
export class ColorEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_en' })
  nameEn!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_km' })
  nameKm!: string;

  @Index({ unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: 9 })
  hex!: string;

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
