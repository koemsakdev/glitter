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
 *   customer     — shops at the store (default). No admin dashboard access.
 *   cashier      — can process sales + check stock at their assigned branch.
 *   manager      — full control of one branch (staff, inventory, products visible at their branch).
 *   admin        — manage everything except creating other admins or super admins.
 *   super_admin  — full system access. Can create/manage other admins.
 *
 * Roles are ordered by power level; higher roles inherit the permissions below them.
 */
export type UserRole =
  | 'customer'
  | 'cashier'
  | 'manager'
  | 'admin'
  | 'super_admin';

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
   * Only super_admin and admin can set roles other than 'customer' during user creation.
   * Self-registration always creates users with role='customer'.
   */
  @Column({
    type: 'enum',
    enum: ['customer', 'cashier', 'manager', 'admin', 'super_admin'],
    default: 'customer',
  })
  role!: UserRole;

  /**
   * Which branch this user is assigned to (for staff roles).
   * NULL for customers, admins, and super_admins (who aren't tied to one branch).
   * REQUIRED for cashiers and managers.
   */
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

  @Column({ type: 'int', default: 0, name: 'token_version' })
  tokenVersion!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => AuthAccountEntity, (account) => account.user)
  authAccounts?: AuthAccountEntity[];
}
