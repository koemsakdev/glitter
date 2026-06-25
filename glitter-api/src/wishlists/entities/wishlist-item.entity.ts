import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { WishlistEntity } from './wishlist.entity';

@Entity('wishlist_items')
@Index(['wishlistId', 'productId'], { unique: true })
export class WishlistItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'wishlist_id' })
  wishlistId!: string;

  @ManyToOne(() => WishlistEntity, (wishlist) => wishlist.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wishlist_id' })
  wishlist!: WishlistEntity;

  @Index()
  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'uuid', nullable: true, name: 'product_variant_id' })
  productVariantId!: string | null;

  @CreateDateColumn({ name: 'added_at' })
  addedAt!: Date;
}
