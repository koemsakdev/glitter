import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/numeric.transformer';
import { OrderEntity } from './order.entity';

/**
 * A single line in an order. Product/variant name, SKU and price are SNAPSHOTTED
 * at sale time so later catalog edits never rewrite order history.
 */
@Entity('order_items')
@Index(['orderId'])
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, (order) => order.items, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @Column({ type: 'uuid', name: 'product_variant_id' })
  productVariantId!: string;

  // --- Snapshots ---
  @Column({ type: 'varchar', length: 255, name: 'product_name' })
  productName!: string;

  @Column({ type: 'varchar', length: 120, name: 'variant_sku' })
  variantSku!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  size!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true, name: 'color_hex' })
  colorHex!: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'unit_price',
    transformer: numericTransformer,
  })
  unitPrice!: number;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'line_total',
    transformer: numericTransformer,
  })
  lineTotal!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
