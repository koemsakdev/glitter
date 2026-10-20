import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';

export type ImageType = 'primary' | 'gallery' | 'thumbnail' | 'zoom';

@Entity('product_images')
@Index(['productId', 'displayOrder'])
export class ProductImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @Column({ type: 'varchar', length: 500, name: 'image_url' })
  imageUrl!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'image_alt_text_en',
  })
  imageAltTextEn!: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'image_alt_text_km',
  })
  imageAltTextKm!: string | null;

  @Column({
    type: 'enum',
    enum: ['primary', 'gallery', 'thumbnail', 'zoom'],
    default: 'gallery',
    name: 'image_type',
  })
  imageType!: ImageType;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * Soft delete: "deleting" stamps this instead of erasing the row, so the
   * record and its history stay traceable. Normal queries skip these rows.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
