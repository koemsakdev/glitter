import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * One attempt to sign in to the dashboard — successful or not. Kept for
 * security review: who tried, from which IP / place / device, and why it
 * failed. Never stores the password.
 */
@Entity('login_attempts')
@Index(['createdAt'])
@Index(['ip', 'createdAt'])
@Index(['success', 'createdAt'])
export class LoginAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /** login_attempt (failed/blocked) | login_success | logout */
  @Column({
    type: 'varchar',
    length: 20,
    default: 'login_attempt',
    name: 'event_type',
  })
  eventType!: 'login_attempt' | 'login_success' | 'logout';

  /** success | failed | blocked (IP was blocked before checking) */
  @Column({ type: 'varchar', length: 10, default: 'failed' })
  status!: 'success' | 'failed' | 'blocked';

  @Column({ type: 'boolean' })
  success!: boolean;

  /** Failures for this username or IP in the last 15 minutes (incl. this). */
  @Column({ type: 'int', default: 0, name: 'failed_attempt_count' })
  failedAttemptCount!: number;

  /** unknown_user | wrong_password | not_staff | no_password | suspended | deleted */
  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    name: 'failure_reason',
  })
  failureReason!: string | null;

  /** What was typed in the username box (lower-cased, trimmed). */
  @Column({ type: 'varchar', length: 255, name: 'username_tried' })
  usernameTried!: string;

  @Column({ type: 'uuid', nullable: true, name: 'user_id' })
  userId!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'user_name' })
  userName!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, name: 'user_role' })
  userRole!: string | null;

  // ---- Network ----
  @Column({ type: 'varchar', length: 64 })
  ip!: string;

  /** Full X-Forwarded-For chain as received (for investigation). */
  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    name: 'forwarded_for',
  })
  forwardedFor!: string | null;

  // ---- Location (from the IP; filled in moments after the attempt) ----
  @Column({ type: 'varchar', length: 80, nullable: true })
  country!: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true, name: 'country_code' })
  countryCode!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  region!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city!: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude!: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude!: number | null;

  /** Internet provider / organisation that owns the IP. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  isp!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'ip_timezone' })
  ipTimezone!: string | null;

  /** IP belongs to a VPN, proxy or Tor exit. */
  @Column({ type: 'boolean', nullable: true, name: 'is_vpn_or_proxy' })
  isVpnOrProxy!: boolean | null;

  /** IP belongs to a hosting / data-centre provider (servers, not homes). */
  @Column({ type: 'boolean', nullable: true, name: 'is_hosting' })
  isHosting!: boolean | null;

  // ---- Session (successful sign-ins) ----
  @Column({ type: 'varchar', length: 64, nullable: true, name: 'session_id' })
  sessionId!: string | null;

  /** SHA-256 of the refresh token issued — never the token itself. */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'session_token_hash',
  })
  sessionTokenHash!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'logout_at' })
  logoutAt!: Date | null;

  // ---- Device ----
  @Column({ type: 'text', nullable: true, name: 'user_agent' })
  userAgent!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  browser!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  os!: string | null;

  /** desktop | mobile | tablet | bot | unknown */
  @Column({ type: 'varchar', length: 20, nullable: true, name: 'device_type' })
  deviceType!: string | null;

  /** Extra details the login page reports (screen, timezone, language…). */
  @Column({ type: 'jsonb', nullable: true, name: 'client_info' })
  clientInfo!: Record<string, unknown> | null;
}
