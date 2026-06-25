import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { WishlistItemEntity } from './wishlist-item.entity';

export type WishlistType = 'default' | 'custom';

@Entity('wishlists')
export class WishlistEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'name_en' })
  nameEn!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true, name: 'name_km' })
  nameKm!: string | null;

  @Column({
    type: 'enum',
    enum: ['default', 'custom'],
    default: 'default',
    name: 'wishlist_type',
  })
  wishlistType!: WishlistType;

  @Column({ type: 'boolean', default: false, name: 'is_public' })
  isPublic!: boolean;

  @OneToMany(() => WishlistItemEntity, (item) => item.wishlist, {
    cascade: true,
  })
  items!: WishlistItemEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
