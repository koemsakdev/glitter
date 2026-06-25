import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AdvertisementEntity } from './advertisement.entity';

export type PlacementLocation =
  | 'home_top'
  | 'home_middle'
  | 'sidebar'
  | 'product_page'
  | 'footer';

export const PLACEMENT_LOCATIONS: PlacementLocation[] = [
  'home_top',
  'home_middle',
  'sidebar',
  'product_page',
  'footer',
];

@Entity('ad_placements')
export class AdPlacementEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'ad_id' })
  adId!: string;

  @ManyToOne(() => AdvertisementEntity, (ad) => ad.placements, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ad_id' })
  advertisement!: AdvertisementEntity;

  @Index()
  @Column({
    type: 'enum',
    enum: ['home_top', 'home_middle', 'sidebar', 'product_page', 'footer'],
    name: 'placement_location',
  })
  placementLocation!: PlacementLocation;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
