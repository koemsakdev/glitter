import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type MenuLocation = 'header' | 'footer';

/**
 * A single storefront navigation link (header or footer menu).
 * `parentId` allows one level of nesting (dropdowns).
 */
@Entity('menu_items')
export class MenuItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150, name: 'label_en' })
  labelEn!: string;

  @Column({ type: 'varchar', length: 150, name: 'label_km' })
  labelKm!: string;

  @Column({ type: 'varchar', length: 500 })
  url!: string;

  @Index()
  @Column({ type: 'enum', enum: ['header', 'footer'], default: 'header' })
  location!: MenuLocation;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
  parentId!: string | null;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false, name: 'open_in_new_tab' })
  openInNewTab!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
