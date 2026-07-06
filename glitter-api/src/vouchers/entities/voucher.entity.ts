import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from '../../common/numeric.transformer';

export type DiscountType = 'percent' | 'fixed';
/** Which part of the total the discount reduces. */
export type DiscountTarget = 'order' | 'delivery';

/**
 * A promotion. When `code` is null it's an AUTOMATIC promo (applies when the
 * cart meets `minSpend`); when `code` is set the customer must enter it.
 */
@Entity('vouchers')
export class VoucherEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Uppercase code, or null for an automatic promo. Postgres allows many NULLs. */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40, nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', length: 100, name: 'name_en' })
  nameEn!: string;

  @Column({ type: 'varchar', length: 100, name: 'name_km', default: '' })
  nameKm!: string;

  @Column({ type: 'varchar', length: 10, name: 'discount_type' })
  discountType!: DiscountType;

  @Column({
    type: 'varchar',
    length: 10,
    name: 'applies_to',
    default: 'order',
  })
  appliesTo!: DiscountTarget;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'discount_value',
    transformer: numericTransformer,
  })
  discountValue!: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    default: 0,
    name: 'min_spend',
    transformer: numericTransformer,
  })
  minSpend!: number;

  /** Cap on the discount amount for percentage promos. Null = no cap. */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
    name: 'max_discount',
    transformer: numericTransformer,
  })
  maxDiscount!: number | null;

  @Column({ type: 'date', nullable: true, name: 'start_at' })
  startAt!: string | null;

  @Column({ type: 'date', nullable: true, name: 'end_at' })
  endAt!: string | null;

  /** Total redemptions allowed across all customers. Null = unlimited. */
  @Column({ type: 'int', nullable: true, name: 'usage_limit' })
  usageLimit!: number | null;

  @Column({ type: 'int', default: 0, name: 'used_count' })
  usedCount!: number;

  /** Only customers who have never ordered before may use this. */
  @Column({ type: 'boolean', default: false, name: 'first_order_only' })
  firstOrderOnly!: boolean;

  /** Only accounts created within this many days may use it. Null = any age. */
  @Column({ type: 'int', nullable: true, name: 'new_account_days' })
  newAccountDays!: number | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
