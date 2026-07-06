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
import { BranchEntity } from '../../branch/entities/branch.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { numericTransformer } from '../../common/numeric.transformer';
import { OrderItemEntity } from './order-item.entity';
import { PaymentEntity } from './payment.entity';

/** Where the order originated. */
export type OrderSource = 'in_store' | 'online';

/**
 * Order lifecycle.
 * - in_store: created `completed` (paid at the counter).
 * - online: pending → paid → processing → shipped → completed.
 * - either: cancelled (pre-fulfilment) or refunded (post-fulfilment).
 */
export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'refunded';

/** Whether the order has been paid for. */
export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

/**
 * Storefront shipping region id. The set of regions is admin-configurable in
 * the store settings, so this is a free-form id (the two built-in ids are
 * `phnom_penh` and `province`).
 */
export type DeliveryRegion = string;

/**
 * Storefront delivery method id. The set of methods is admin-configurable, so
 * this is a free-form id (built-in ids: cod, grab, pickup, vet_express).
 */
export type DeliveryMethod = string;

/**
 * How the customer pays — the chosen payment option's id (admin-configurable;
 * built-in ids include aba_khqr, cash). Legacy orders may hold khqr/cod/on_pickup.
 */
export type OrderPaymentMethod = string;

@Entity('orders')
@Index(['branchId'])
@Index(['status'])
@Index(['source'])
// Orders list = filter by branch (+ status) ordered by recency.
@Index('idx_order_branch_status_created', ['branchId', 'status', 'createdAt'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, name: 'order_number' })
  orderNumber!: string;

  @Column({ type: 'enum', enum: ['in_store', 'online'] })
  source!: OrderSource;

  @Column({
    type: 'enum',
    enum: [
      'pending',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled',
      'refunded',
    ],
    default: 'pending',
  })
  status!: OrderStatus;

  @Column({ type: 'uuid', name: 'branch_id' })
  branchId!: string;

  @ManyToOne(() => BranchEntity, { onDelete: 'RESTRICT', eager: false })
  @JoinColumn({ name: 'branch_id' })
  branch?: BranchEntity;

  // Customer (a user with role 'customer'); null for anonymous walk-ins.
  @Column({ type: 'uuid', nullable: true, name: 'customer_id' })
  customerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'customer_id' })
  customer?: UserEntity | null;

  // Staff member (a user) who created an in-store sale; null for online.
  @Column({ type: 'uuid', nullable: true, name: 'cashier_id' })
  cashierId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'cashier_id' })
  cashier?: UserEntity | null;

  // Snapshot of customer contact for the receipt (works for walk-ins too).
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'customer_name',
  })
  customerName!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'customer_phone',
  })
  customerPhone!: string | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  subtotal!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'discount_total',
    transformer: numericTransformer,
  })
  discountTotal!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'shipping_cost',
    transformer: numericTransformer,
  })
  shippingCost!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'tax_amount',
    transformer: numericTransformer,
  })
  taxAmount!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'grand_total',
    transformer: numericTransformer,
  })
  grandTotal!: number;

  @Column({
    type: 'enum',
    enum: ['unpaid', 'partial', 'paid', 'refunded'],
    default: 'unpaid',
    name: 'payment_status',
  })
  paymentStatus!: OrderPaymentStatus;

  @Column({ type: 'varchar', length: 8, default: 'USD' })
  currency!: string;

  // ----- Storefront delivery / payment details (null for in-store) -----

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    name: 'delivery_region',
  })
  deliveryRegion!: DeliveryRegion | null;

  // Snapshot of the region's display name at order time (region config can be
  // renamed/removed later, so we keep the label that was shown to the customer).
  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'delivery_region_name',
  })
  deliveryRegionName!: string | null;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    name: 'delivery_method',
  })
  deliveryMethod!: DeliveryMethod | null;

  // Snapshot of the method's display name at order time.
  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'delivery_method_name',
  })
  deliveryMethodName!: string | null;

  @Column({ type: 'text', nullable: true, name: 'delivery_address' })
  deliveryAddress!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    name: 'delivery_lat',
    transformer: numericTransformer,
  })
  deliveryLat!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    name: 'delivery_lng',
    transformer: numericTransformer,
  })
  deliveryLng!: number | null;

  @Column({
    type: 'varchar',
    length: 40,
    nullable: true,
    name: 'payment_method',
  })
  paymentMethod!: OrderPaymentMethod | null;

  // Snapshot of the payment option's display name at order time.
  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'payment_method_name',
  })
  paymentMethodName!: string | null;

  @Column({ type: 'text', nullable: true, name: 'payment_proof_url' })
  paymentProofUrl!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true, name: 'voucher_code' })
  voucherCode!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true })
  items?: OrderItemEntity[];

  @OneToMany(() => PaymentEntity, (payment) => payment.order, { cascade: true })
  payments?: PaymentEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
