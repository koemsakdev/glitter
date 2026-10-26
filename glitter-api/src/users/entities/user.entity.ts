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
import { AuthAccountEntity } from './auth-account.entity';
import { BranchEntity } from '../../branch/entities/branch.entity';

export type AccountStatus = 'active' | 'suspended' | 'deleted';

export type ProfileImageSource = 'none' | 'oauth' | 'uploaded' | 'removed';

/**
 * User roles — determines what the user can access in the admin dashboard.
 *
 *   customer — shops at the store (default). No dashboard access.
 *   cashier  — sells at their branch: creates orders, views orders, checks stock.
 *   manager  — runs one branch: catalog, orders, promotions, inventory, stats.
 *   admin    — everything, incl. staff accounts, settings, branches, storefront.
 *              Only admins can create or change staff accounts.
 *
 * (The old `super_admin` role was merged into `admin`; see SeedService.)
 */
export type UserRole = 'customer' | 'cashier' | 'manager' | 'admin';

@Entity('users')
// Customer / staff lists filter by role and account status.
@Index('idx_user_role', ['role'])
@Index('idx_user_account_status', ['accountStatus'])
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  /** Dashboard sign-in name for staff (lowercase, unique). Customers: null. */
  @Index({ unique: true, where: '"username" IS NOT NULL' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  username!: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'email_verified_at',
  })
  emailVerifiedAt!: Date | null;

  @Index({ unique: true, where: '"phone_number" IS NOT NULL' })
  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
    name: 'phone_number',
  })
  phoneNumber!: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'phone_verified_at',
  })
  phoneVerifiedAt!: Date | null;

  // ----- Email verification (one-time code) -----
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'email_otp_hash',
  })
  emailOtpHash!: string | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'email_otp_expires_at',
  })
  emailOtpExpiresAt!: Date | null;

  @Column({ type: 'int', default: 0, name: 'email_otp_attempts' })
  emailOtpAttempts!: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'email_otp_sent_at',
  })
  emailOtpSentAt!: Date | null;

  @Column({ type: 'varchar', length: 255, name: 'full_name' })
  fullName!: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    name: 'profile_image_url',
  })
  profileImageUrl!: string | null;

  @Column({
    type: 'enum',
    enum: ['none', 'oauth', 'uploaded', 'removed'],
    default: 'none',
    name: 'profile_image_source',
  })
  profileImageSource!: ProfileImageSource;

  /**
   * The user's role. Defaults to 'customer'.
   * Only admins can set roles other than 'customer' (staff accounts).
   * Self-registration always creates users with role='customer'.
   */
  @Column({
    type: 'enum',
    // 'super_admin' is a legacy value kept only so existing databases sync
    // safely; rows are migrated to 'admin' on startup and it's never assigned.
    enum: ['customer', 'cashier', 'manager', 'admin', 'super_admin'],
    default: 'customer',
  })
  role!: UserRole;

  /**
   * Which branch this user is assigned to (for staff roles).
   * NULL for customers and admins (who aren't tied to one branch).
   * REQUIRED for cashiers and managers.
   */
  /** Extra permissions an admin granted on top of the role (see auth/permissions.ts). */
  @Column({
    type: 'text',
    array: true,
    default: () => "'{}'",
    name: 'extra_permissions',
  })
  extraPermissions!: string[];

  @Column({ type: 'uuid', nullable: true, name: 'branch_id' })
  branchId!: string | null;

  @ManyToOne(() => BranchEntity, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'branch_id' })
  branch?: BranchEntity;

  @Column({
    type: 'enum',
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
    name: 'account_status',
  })
  accountStatus!: AccountStatus;

  @Column({ type: 'boolean', default: false, name: 'is_profile_complete' })
  isProfileComplete!: boolean;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_password_changed_at',
  })
  lastPasswordChangedAt!: Date | null;

  /** Signed in with an admin-given (default/reset) password — must pick a
   * new one before using anything else. */
  @Column({ type: 'boolean', default: false, name: 'must_change_password' })
  mustChangePassword!: boolean;

  @Column({ type: 'int', default: 0, name: 'token_version' })
  tokenVersion!: number;

  /** When the account was moved to the recycle bin (null = live). A plain
   * column on purpose — not TypeORM's soft-delete — so past orders and
   * reviews keep showing who they belong to. */
  @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
  deletedAt!: Date | null;

  /** Sign-in identifiers set aside while in the recycle bin (freed so they
   * can be reused), put back on restore. */
  @Column({ type: 'jsonb', nullable: true, name: 'deleted_identity' })
  deletedIdentity!: {
    email: string | null;
    username: string | null;
    phoneNumber: string | null;
    accounts: { id: string; providerAccountId: string }[];
  } | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => AuthAccountEntity, (account) => account.user)
  authAccounts?: AuthAccountEntity[];
}
