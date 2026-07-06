import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** What a notification is about (client renders localized text from type + data). */
export type NotificationType =
  | 'order_new'
  | 'review_new'
  | 'order_status'
  | 'payment_confirmed'
  | 'low_stock';

/**
 * One notification row PER recipient (fan-out), so read/unread state is simple
 * and per-user. Text is rendered on the client from `type` + `data` so it can
 * be localized (EN/KM).
 */
@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar', length: 40 })
  type!: NotificationType;

  /** Structured payload for rendering, e.g. { orderNumber, status, productName, orderId }. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  data!: Record<string, unknown>;

  /** App-relative link the notification opens (dashboard or storefront route). */
  @Column({ type: 'varchar', length: 255, nullable: true })
  link!: string | null;

  @Column({ type: 'boolean', default: false, name: 'is_read' })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
