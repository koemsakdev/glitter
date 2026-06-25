import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BannerPlacementEntity } from './banner-placement.entity';

export type BannerType = 'hero' | 'promo' | 'category' | 'seasonal';
export type BannerEvent =
  | 'none'
  | 'new_year'
  | 'khmer_new_year'
  | 'valentine'
  | 'black_friday';
export type BannerStatus = 'active' | 'inactive' | 'scheduled' | 'archived';

@Entity('banners')
export class BannerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'title_en' })
  titleEn!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'title_km' })
  titleKm!: string | null;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'image_alt_text',
  })
  imageAltText!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'link_url' })
  linkUrl!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'description_en',
  })
  descriptionEn!: string | null;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'description_km',
  })
  descriptionKm!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'button_label_en',
  })
  buttonLabelEn!: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'button_label_km',
  })
  buttonLabelKm!: string | null;

  @Column({
    type: 'enum',
    enum: ['hero', 'promo', 'category', 'seasonal'],
    default: 'hero',
    name: 'banner_type',
  })
  bannerType!: BannerType;

  @Column({
    type: 'enum',
    enum: ['none', 'new_year', 'khmer_new_year', 'valentine', 'black_friday'],
    default: 'none',
    name: 'banner_event',
  })
  bannerEvent!: BannerEvent;

  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'scheduled', 'archived'],
    default: 'active',
  })
  status!: BannerStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate!: Date | null;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @OneToMany(() => BannerPlacementEntity, (p) => p.banner, { cascade: true })
  placements!: BannerPlacementEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
