import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/helpers/password.helper';
import { AuthAccountEntity } from '../users/entities/auth-account.entity';
import { UserEntity } from '../users/entities/user.entity';

/**
 * On module init: migrate legacy super_admin rows to admin, then make sure an
 * admin exists — creating one from .env (SEED_ADMIN_*) on a fresh database.
 *
 * Safe to leave on — it only creates a user if zero admins exist.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthAccountEntity)
    private readonly authAccountRepository: Repository<AuthAccountEntity>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.mergeSuperAdmins();
    await this.seedAdmin();
  }

  /**
   * One-time, idempotent migration: the separate "super admin" role was
   * merged into "admin". Converts any remaining rows so they keep full access.
   */
  private async mergeSuperAdmins(): Promise<void> {
    const result = await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({ role: 'admin' })
      .where('role = :legacy', { legacy: 'super_admin' })
      .execute();
    if (result.affected) {
      this.logger.log(`Merged ${result.affected} super admin(s) into admin`);
    }
  }

  /** Ensure at least one admin exists (first boot), signing in as "admin". */
  private async seedAdmin(): Promise<void> {
    const existingAdmin = await this.userRepository.findOne({
      where: { role: 'admin' },
      order: { createdAt: 'ASC' },
    });

    if (existingAdmin) {
      // Give the original admin a username so it can use the new login.
      if (!existingAdmin.username) {
        const taken = await this.userRepository.findOne({
          where: { username: 'admin' },
        });
        if (!taken) {
          existingAdmin.username = 'admin';
          await this.userRepository.save(existingAdmin);
          this.logger.log('Admin account can now sign in as "admin"');
        }
      }
      return;
    }

    const email = this.configService.get<string>('SEED_ADMIN_EMAIL');
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD');
    const fullName =
      this.configService.get<string>('SEED_ADMIN_NAME') ?? 'Shop Owner';

    if (!email || !password) {
      this.logger.warn(
        'SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD not set — skipping seed',
      );
      return;
    }

    try {
      const user = this.userRepository.create({
        email: email.toLowerCase(),
        username: 'admin',
        phoneNumber: null,
        fullName,
        profileImageUrl: null,
        profileImageSource: 'none',
        role: 'admin',
        branchId: null,
        accountStatus: 'active',
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: null,
        isProfileComplete: false,
        tokenVersion: 0,
      });
      const savedUser = await this.userRepository.save(user);

      const passwordHash = await hashPassword(password);
      const authAccount = this.authAccountRepository.create({
        userId: savedUser.id,
        provider: 'email',
        providerAccountId: email.toLowerCase(),
        passwordHash,
      });
      await this.authAccountRepository.save(authAccount);

      this.logger.log('─────────────────────────────────────────────────');
      this.logger.log('✅ Admin account seeded');
      this.logger.log('   Username: admin  (password: SEED_ADMIN_PASSWORD)');
      this.logger.log('   ⚠️  Change this password after first login!');
      this.logger.log('─────────────────────────────────────────────────');
    } catch (error) {
      this.logger.error('Failed to seed admin', error);
    }
  }
}
