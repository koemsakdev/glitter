import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';
import { UserEntity } from '../../users/entities/user.entity';

export type ReviewStatus = 'pending' | 'approved' | 'hidden';

@Entity('reviews')
@Index(['productId', 'status'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  /** Nullable until customer accounts exist (guest reviews). */
  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @Column({ type: 'varchar', length: 120, name: 'reviewer_name' })
  reviewerName!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'title_en' })
  titleEn!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'title_km' })
  titleKm!: string | null;

  @Column({ type: 'text', nullable: true, name: 'comment_en' })
  commentEn!: string | null;

  @Column({ type: 'text', nullable: true, name: 'comment_km' })
  commentKm!: string | null;

  /** Customer-uploaded photo URLs (served paths). */
  @Column({ type: 'jsonb', name: 'image_urls', default: () => "'[]'" })
  imageUrls!: string[];

  @Column({ type: 'boolean', default: false, name: 'verified_purchase' })
  verifiedPurchase!: boolean;

  @Column({ type: 'int', default: 0, name: 'helpful_count' })
  helpfulCount!: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'hidden'],
    default: 'pending',
  })
  status!: ReviewStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
