import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * ABA PayWay credentials + settings. A single-row table (the service keeps one
 * canonical row). Held in its own table — NOT in app_settings — because
 * app_settings has a public read endpoint and these values are secret. Only
 * the admin config endpoints and the backend PayWay service ever read it; it is
 * never exposed to the storefront.
 */
@Entity('payment_config')
export class PaymentConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Master switch: when false, KHQR falls back to manual proof upload. */
  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  /** Use the sandbox host instead of production. */
  @Column({ type: 'boolean', default: true })
  sandbox!: boolean;

  @Column({ type: 'varchar', length: 60, default: '', name: 'merchant_id' })
  merchantId!: string;

  /** PayWay API key (a.k.a. "public key" hash string) — HMAC secret. */
  @Column({ type: 'text', default: '', name: 'api_key' })
  apiKey!: string;

  @Column({ type: 'text', default: '', name: 'rsa_public_key' })
  rsaPublicKey!: string;

  @Column({ type: 'text', default: '', name: 'rsa_private_key' })
  rsaPrivateKey!: string;

  /**
   * Public HTTPS URL PayWay POSTs the payment result to (pushback). Optional —
   * when empty (e.g. local dev), confirmation relies on status polling.
   */
  @Column({ type: 'text', default: '', name: 'webhook_url' })
  webhookUrl!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
