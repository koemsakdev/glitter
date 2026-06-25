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
import { OrderEntity } from '../../orders/entities/order.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';

export type ShipmentStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'cancelled';

@Entity('shipments')
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderEntity;

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch!: BranchEntity | null;

  @Index({ unique: true })
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'tracking_number',
  })
  trackingNumber!: string | null;

  @Column({
    type: 'varchar',
    length: 120,
    nullable: true,
    name: 'carrier_name',
  })
  carrierName!: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: [
      'pending',
      'processing',
      'shipped',
      'in_transit',
      'delivered',
      'returned',
      'cancelled',
    ],
    default: 'pending',
    name: 'shipment_status',
  })
  status!: ShipmentStatus;

  @Column({ type: 'timestamp', nullable: true, name: 'shipped_date' })
  shippedDate!: Date | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'estimated_delivery_date',
  })
  estimatedDeliveryDate!: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'actual_delivery_date' })
  actualDeliveryDate!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
