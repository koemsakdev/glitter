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

export type PaymentMethod = 'cash' | 'khqr' | 'aba';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

@Entity('payments')
@Index(['orderId'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'order_id' })
  orderId!: string;

  @ManyToOne(() => OrderEntity, (order) => order.payments, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'order_id' })
  order?: OrderEntity;

  @Column({ type: 'enum', enum: ['cash', 'khqr', 'aba'] })
  method!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'paid',
  })
  status!: PaymentStatus;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    transformer: numericTransformer,
  })
  amount!: number;

  // External reference (KHQR/ABA transaction id, etc.)
  @Column({ type: 'varchar', length: 255, nullable: true })
  reference!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
