import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AdPlacementEntity } from './ad-placement.entity';

export type AdType = 'banner' | 'popup' | 'inline' | 'sidebar';
export type AdStatus = 'active' | 'inactive' | 'scheduled' | 'archived';

@Entity('advertisements')
export class AdvertisementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200, name: 'title_en' })
  titleEn!: string;

  @Column({ type: 'varchar', length: 200, name: 'title_km' })
  titleKm!: string;

  @Column({ type: 'text', nullable: true, name: 'content_en' })
  contentEn!: string | null;

  @Column({ type: 'text', nullable: true, name: 'content_km' })
  contentKm!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'link_url' })
  linkUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ['banner', 'popup', 'inline', 'sidebar'],
    default: 'banner',
    name: 'ad_type',
  })
  adType!: AdType;

  @Column({ type: 'int', default: 1, name: 'display_frequency' })
  displayFrequency!: number;

  @Column({ type: 'int', default: 0, name: 'view_count' })
  viewCount!: number;

  @Column({ type: 'int', default: 0, name: 'click_count' })
  clickCount!: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ['active', 'inactive', 'scheduled', 'archived'],
    default: 'active',
  })
  status!: AdStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'start_date' })
  startDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'end_date' })
  endDate!: Date | null;

  @OneToMany(() => AdPlacementEntity, (p) => p.advertisement, {
    cascade: true,
  })
  placements!: AdPlacementEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
