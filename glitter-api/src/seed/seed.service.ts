import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/helpers/password.helper';
import { AuthAccountEntity } from '../users/entities/auth-account.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuditLogService } from '../audit-logs/audit-log.service';

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
    private readonly audit: AuditLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.mergeSuperAdmins();
    await this.seedAdmin();
    await this.claimExistingData();
  }

  /**
   * Right after a data reset the audit log is empty, but the kept catalog
   * (branches, categories, brands, colors, badges, products, stock) is still
   * there. Record those as created by the seed admin so every audit trail
   * shows an owner. Runs only while the audit log is completely empty — on any
   * later start it does nothing.
   */
  private async claimExistingData(): Promise<void> {
    try {
      if ((await this.audit.count()) > 0) return;
      const username = (
        this.configService.get<string>('SEED_ADMIN_USERNAME') || 'admin'
      )
        .trim()
        .toLowerCase();
      const admin =
        (await this.userRepository.findOne({
          where: { username, role: 'admin' },
        })) ??
        (await this.userRepository.findOne({
          where: { role: 'admin' },
          order: { createdAt: 'ASC' },
        }));
      if (!admin) return;
      const added = await this.audit.backfillCreates(admin);
      if (added > 0) {
        this.logger.log(
          `Recorded ${added} existing catalog records as created by ${admin.fullName} (@${admin.username})`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to record existing data in the audit log',
        error,
      );
    }
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

    // The dashboard signs in with username + password; email is optional.
    const username = (
      this.configService.get<string>('SEED_ADMIN_USERNAME') || 'admin'
    )
      .trim()
      .toLowerCase();
    const email =
      this.configService
        .get<string>('SEED_ADMIN_EMAIL')
        ?.trim()
        .toLowerCase() || null;
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD');
    const fullName =
      this.configService.get<string>('SEED_ADMIN_NAME') ?? 'Shop Owner';

    if (!password) {
      this.logger.warn('SEED_ADMIN_PASSWORD not set — skipping admin seed');
      return;
    }

    try {
      const user = this.userRepository.create({
        email,
        username,
        phoneNumber: null,
        fullName,
        profileImageUrl: null,
        profileImageSource: 'none',
        role: 'admin',
        branchId: null,
        accountStatus: 'active',
        emailVerifiedAt: email ? new Date() : null,
        phoneVerifiedAt: null,
        isProfileComplete: false,
        tokenVersion: 0,
      });
      const savedUser = await this.userRepository.save(user);

      const passwordHash = await hashPassword(password);
      const authAccount = this.authAccountRepository.create({
        userId: savedUser.id,
        provider: 'email',
        providerAccountId: email ?? username,
        passwordHash,
      });
      await this.authAccountRepository.save(authAccount);

      this.logger.log({
        message: `Admin account seeded — sign in as "${username}" with SEED_ADMIN_PASSWORD`,
        event: { action: 'seed.admin', outcome: 'success' },
        user: { name: username, roles: ['admin'] },
      });
    } catch (error) {
      this.logger.error('Failed to seed admin', error);
    }
  }
}
