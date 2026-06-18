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
import { UserEntity } from '../../users/entities/user.entity';

export type AddressType = 'shipping' | 'billing' | 'both';

/**
 * Customer addresses for shipping/billing orders.
 * A user can have many addresses. One of each type can be marked as default.
 */
@Entity('addresses')
export class AddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  /**
   * Short label like "Home", "Work", "Mom's house" to help users identify it.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  label!: string | null;

  /**
   * Who should receive the package. Often the user's own name, but can differ
   * (e.g., buying a gift for someone else).
   */
  @Column({ type: 'varchar', length: 255, name: 'recipient_name' })
  recipientName!: string;

  /**
   * Contact phone for the delivery driver. Required.
   */
  @Column({ type: 'varchar', length: 20, name: 'recipient_phone' })
  recipientPhone!: string;

  /**
   * Cambodian geographic breakdown.
   * Province examples: "Phnom Penh", "Siem Reap", "Battambang"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  province!: string | null;

  /**
   * District in provinces, Khan (ខណ្ឌ) in Phnom Penh.
   * Examples: "Chamkar Mon", "Tuol Kouk", "Sen Sok"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  /**
   * Commune (ឃុំ) in provinces, Sangkat (សង្កាត់) in Phnom Penh.
   * Examples: "Tuol Tompoung 1", "Boeung Keng Kang 1"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  commune!: string | null;

  /**
   * Village (ភូមិ) or street name.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  village!: string | null;

  /**
   * Free-form street address, house number, building name.
   * Example: "House #42, Street 271"
   */
  @Column({ type: 'varchar', length: 500, name: 'street_address' })
  streetAddress!: string;

  /**
   * Optional postal code (Cambodian postal codes are 5 digits).
   */
  @Column({ type: 'varchar', length: 10, nullable: true, name: 'postal_code' })
  postalCode!: string | null;

  /**
   * Free-form note to help drivers find the place.
   * Example: "Blue gate next to Angkor Market, second floor"
   */
  @Column({ type: 'text', nullable: true })
  landmark!: string | null;

  /**
   * Type of address. 'both' means it can be used for shipping OR billing.
   */
  @Column({
    type: 'enum',
    enum: ['shipping', 'billing', 'both'],
    default: 'both',
    name: 'address_type',
  })
  addressType!: AddressType;

  /**
   * Whether this is the user's default shipping address.
   * Enforced: only one address per user can have isDefaultShipping=true.
   */
  @Column({ type: 'boolean', default: false, name: 'is_default_shipping' })
  isDefaultShipping!: boolean;

  /**
   * Whether this is the user's default billing address.
   */
  @Column({ type: 'boolean', default: false, name: 'is_default_billing' })
  isDefaultBilling!: boolean;

  /**
   * Optional GPS coordinates for map display / delivery routing.
   * Stored as decimals. Null if user didn't pin a location.
   */
  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  latitude!: string | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
  })
  longitude!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
