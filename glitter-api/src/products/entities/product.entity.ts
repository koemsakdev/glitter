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
import { CategoryEntity } from '../../category/entities/category.entity';
import { BrandEntity } from '../../brands/entities/brand.entity';
import { ProductImageEntity } from '../../product-images/entities/product-image.entity';
import { ProductVariantEntity } from '../../product-variants/entities/product-variant.entity';
import { ProductBadgeEntity } from '../../product-badges/entities/product-badge.entity';

export type ProductType = 'standard' | 'featured' | 'limited' | 'exclusive';
export type ProductStatus =
  | 'draft'
  | 'active'
  | 'out_of_stock'
  | 'discontinued'
  | 'archived';

@Entity('products')
// Catalog listing filters by status, often within a category/brand.
@Index('idx_product_status', ['status'])
@Index('idx_product_category', ['categoryId'])
@Index('idx_product_brand', ['brandId'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'category_id' })
  categoryId!: string;

  @ManyToOne(() => CategoryEntity, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'category_id' })
  category?: CategoryEntity;

  @Column({ type: 'uuid', name: 'brand_id' })
  brandId!: string;

  @ManyToOne(() => BrandEntity, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'brand_id' })
  brand?: BrandEntity;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100 })
  sku!: string;

  @Column({ type: 'varchar', length: 255, name: 'name_en' })
  nameEn!: string;

  @Column({ type: 'varchar', length: 255, name: 'name_km' })
  nameKm!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  slug!: string;

  @Column({ type: 'text', nullable: true, name: 'description_en' })
  descriptionEn!: string | null;

  @Column({ type: 'text', nullable: true, name: 'description_km' })
  descriptionKm!: string | null;

  @Column({ type: 'text', nullable: true, name: 'details_en' })
  detailsEn!: string | null;

  @Column({ type: 'text', nullable: true, name: 'details_km' })
  detailsKm!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'original_price',
  })
  originalPrice!: string | null;

  @Column({
    type: 'enum',
    enum: ['standard', 'featured', 'limited', 'exclusive'],
    default: 'standard',
    name: 'product_type',
  })
  productType!: ProductType;

  @Column({
    type: 'enum',
    enum: ['draft', 'active', 'out_of_stock', 'discontinued', 'archived'],
    default: 'draft',
  })
  status!: ProductStatus;

  @Column({ type: 'boolean', default: false, name: 'has_box' })
  hasBox!: boolean;

  @Column({ type: 'boolean', default: true, name: 'has_single_variant' })
  hasSingleVariant!: boolean;

  @Column({ type: 'int', default: 0, name: 'total_stock' })
  totalStock!: number;

  @Column({ type: 'float', default: 0, name: 'average_rating' })
  averageRating!: number;

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Reverse relations
  @OneToMany(() => ProductImageEntity, (image) => image.product)
  images?: ProductImageEntity[];

  @OneToMany(() => ProductVariantEntity, (variant) => variant.product)
  variants?: ProductVariantEntity[];

  @OneToMany(() => ProductBadgeEntity, (badge) => badge.product)
  badges?: ProductBadgeEntity[];
}
