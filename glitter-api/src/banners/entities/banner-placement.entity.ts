import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BannerEntity } from './banner.entity';

export type BannerPlacement =
  | 'home_hero'
  | 'home_secondary'
  | 'category_top'
  | 'checkout';

export const BANNER_PLACEMENTS: BannerPlacement[] = [
  'home_hero',
  'home_secondary',
  'category_top',
  'checkout',
];

@Entity('banner_placements')
export class BannerPlacementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'banner_id' })
  bannerId!: string;

  @ManyToOne(() => BannerEntity, (banner) => banner.placements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'banner_id' })
  banner!: BannerEntity;

  @Index()
  @Column({
    type: 'enum',
    enum: ['home_hero', 'home_secondary', 'category_top', 'checkout'],
    name: 'placement_location',
  })
  placementLocation!: BannerPlacement;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
