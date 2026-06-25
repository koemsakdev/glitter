import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from '../../products/entities/product.entity';

export type RelationType = 'related' | 'upsell' | 'cross_sell';

@Entity('related_products')
@Index(['productId', 'relatedProductId'], { unique: true })
export class RelatedProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'product_id' })
  productId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @Column({ type: 'uuid', name: 'related_product_id' })
  relatedProductId!: string;

  @ManyToOne(() => ProductEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'related_product_id' })
  relatedProduct!: ProductEntity;

  @Column({
    type: 'enum',
    enum: ['related', 'upsell', 'cross_sell'],
    default: 'related',
    name: 'relation_type',
  })
  relationType!: RelationType;

  @Column({ type: 'int', default: 0, name: 'display_order' })
  displayOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
