import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';

@Entity('product_variants')
@Index(['productId', 'size', 'color'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class ProductVariantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, (product) => product.variants, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'product_id' })
  product?: ProductEntity;

  @Index({ unique: true, where: '"deleted_at" IS NULL' })
  @Column({ type: 'varchar', length: 100, name: 'variant_sku' })
  variantSku!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  size!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 7, nullable: true, name: 'color_hex' })
  colorHex!: string | null;

  @Column({ type: 'int', default: 0, name: 'quantity_in_stock' })
  quantityInStock!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'price_override',
  })
  priceOverride!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  /**
   * Soft delete: "deleting" stamps this instead of erasing the row, so the
   * record and its history stay traceable. Normal queries skip these rows.
   */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt!: Date | null;
}
