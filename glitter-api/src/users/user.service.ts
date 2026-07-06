import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { promises as fs } from 'fs';
import * as path from 'path';
import { hashPassword } from '../auth/helpers/password.helper';
import { BranchEntity } from '../branch/entities/branch.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UserEntity, UserRole } from './entities/user.entity';
import {
  AuthAccountEntity,
  AuthProvider,
} from './entities/auth-account.entity';
import {
  UserDetailResponse,
  UserListResponse,
  UserResponse,
} from './types/user-response.type';

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');

// Roles that must be tied to a branch
const BRANCH_REQUIRED_ROLES: UserRole[] = ['cashier', 'manager'];

// Roles that must NOT have a branch (they work across branches)
const BRANCH_FORBIDDEN_ROLES: UserRole[] = ['customer', 'admin', 'super_admin'];

export interface OAuthProfileData {
  provider: AuthProvider;
  providerAccountId: string;
  email: string | null;
  fullName: string;
  profileImageUrl: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  rawProfile: Record<string, unknown>;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthAccountEntity)
    private readonly authAccountRepository: Repository<AuthAccountEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepository: Repository<BranchEntity>,
    private readonly dataSource: DataSource,
  ) {}

  // ==========================================================================
  // ADMIN-FACING CRUD
  // ==========================================================================

  async create(dto: CreateUserDto): Promise<UserDetailResponse> {
    if (dto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existingEmail !== null) {
        throw new ConflictException(
          `Email "${dto.email}" is already registered`,
        );
      }
    }

    if (dto.phoneNumber) {
      const existingPhone = await this.userRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existingPhone !== null) {
        throw new ConflictException(
          `Phone "${dto.phoneNumber}" is already registered`,
        );
      }
    }

    const role: UserRole = dto.role ?? 'customer';
    await this.validateRoleBranchCombination(role, dto.branchId ?? null);
    if (role === 'super_admin') {
      await this.assertNoOtherSuperAdmin();
    }

    const entity = this.userRepository.create({
      email: dto.email ? dto.email.toLowerCase() : null,
      phoneNumber: dto.phoneNumber ?? null,
      fullName: dto.fullName,
      profileImageUrl: null,
      profileImageSource: 'none',
      role,
      branchId: dto.branchId ?? null,
      accountStatus: dto.accountStatus ?? 'active',
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      tokenVersion: 0,
    });
    entity.isProfileComplete = this.computeProfileComplete(entity);

    const saved = await this.userRepository.save(entity);
    return { data: await this.toResponseWithRelations(saved) };
  }

  async findAll(query: UserQueryDto): Promise<UserListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be greater than 0');
    }

    const skip = (page - 1) * limit;

    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.authAccounts', 'authAccounts')
      .leftJoinAndSelect('user.branch', 'branch');

    if (query.accountStatus) {
      qb.andWhere('user.accountStatus = :accountStatus', {
        accountStatus: query.accountStatus,
      });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.staffOnly) {
      qb.andWhere('user.role != :customerRole', { customerRole: 'customer' });
    }

    if (query.branchId) {
      qb.andWhere('user.branchId = :branchId', { branchId: query.branchId });
    }

    if (query.search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.phoneNumber ILIKE :search OR user.fullName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.provider) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM auth_accounts aa WHERE aa.user_id = user.id AND aa.provider = :provider)',
        { provider: query.provider },
      );
    }

    // Highest role first (role enum is declared customer→…→super_admin, so
    // DESC puts super_admin on top), then newest within the same role.
    qb.orderBy('user.role', 'DESC')
      .addOrderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    return {
      data: users.map((u: UserEntity) => this.toResponse(u)),
      total: Number(total),
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<UserDetailResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['authAccounts', 'branch'],
    });

    if (user === null) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return { data: this.toResponse(user) };
  }

  async findByEmail(email: string): Promise<UserDetailResponse> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['authAccounts', 'branch'],
    });

    if (user === null) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }

    return { data: this.toResponse(user) };
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserDetailResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['authAccounts', 'branch'],
    });

    if (user === null) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing !== null && existing.id !== id) {
        throw new ConflictException(
          `Email "${dto.email}" is already registered`,
        );
      }
      user.email = dto.email.toLowerCase();
      user.emailVerifiedAt = null;
    }

    if (dto.phoneNumber && dto.phoneNumber !== user.phoneNumber) {
      const existing = await this.userRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing !== null && existing.id !== id) {
        throw new ConflictException(
          `Phone "${dto.phoneNumber}" is already registered`,
        );
      }
      user.phoneNumber = dto.phoneNumber;
      user.phoneVerifiedAt = null;
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.accountStatus !== undefined) user.accountStatus = dto.accountStatus;

    // Role/branch changes need validation
    const newRole = dto.role ?? user.role;
    const newBranchId =
      dto.branchId !== undefined ? dto.branchId : user.branchId;

    if (dto.role !== undefined || dto.branchId !== undefined) {
      await this.validateRoleBranchCombination(newRole, newBranchId);
      if (newRole === 'super_admin') {
        await this.assertNoOtherSuperAdmin(user.id);
      }

      if (dto.role !== undefined) {
        // Role change invalidates tokens so new permissions take effect
        user.role = newRole;
        user.tokenVersion += 1;
      }
      if (dto.branchId !== undefined) {
        user.branchId = dto.branchId ?? null;
      }
    }

    user.isProfileComplete = this.computeProfileComplete(user);

    const updated = await this.userRepository.save(user);
    return { data: await this.toResponseWithRelations(updated) };
  }

  // ==========================================================================
  // AVATAR
  // ==========================================================================

  async uploadAvatar(
    id: string,
    file: Express.Multer.File,
  ): Promise<UserDetailResponse> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['authAccounts', 'branch'],
    });

    if (user === null) {
      await this.deleteFileByFilename(file.filename);
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (
      user.profileImageSource === 'uploaded' &&
      user.profileImageUrl !== null
    ) {
      await this.deleteAvatarFile(user.profileImageUrl);
    }

    user.profileImageUrl = `/upload/avatars/${file.filename}`;
    user.profileImageSource = 'uploaded';

    const updated = await this.userRepository.save(user);
    return { data: await this.toResponseWithRelations(updated) };
  }

  async removeAvatar(id: string): Promise<UserDetailResponse> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['authAccounts', 'branch'],
    });

    if (user === null) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (
      user.profileImageSource === 'uploaded' &&
      user.profileImageUrl !== null
    ) {
      await this.deleteAvatarFile(user.profileImageUrl);
    }

    user.profileImageUrl = null;
    // 'removed' (not 'none') so a later OAuth login won't re-fill it from Google.
    user.profileImageSource = 'removed';

    const updated = await this.userRepository.save(user);
    return { data: await this.toResponseWithRelations(updated) };
  }

  // ==========================================================================
  // DELETE
  // ==========================================================================

  async softDelete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (user === null) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    user.accountStatus = 'deleted';
    user.tokenVersion += 1;
    await this.userRepository.save(user);
  }

  async hardDelete(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });

    if (user === null) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (
      user.profileImageSource === 'uploaded' &&
      user.profileImageUrl !== null
    ) {
      await this.deleteAvatarFile(user.profileImageUrl);
    }

    await this.userRepository.remove(user);
  }

  // ==========================================================================
  // AUTH-FACING METHODS
  // ==========================================================================

  /**
   * Register via email+password — ALWAYS creates role='customer'.
   * Self-registration can never create staff/admin accounts.
   */
  async registerWithEmail(params: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
  }): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const authRepo = manager.getRepository(AuthAccountEntity);

      const normalizedEmail = params.email.toLowerCase();

      const existingUser = await userRepo.findOne({
        where: { email: normalizedEmail },
      });
      if (existingUser !== null) {
        throw new ConflictException(
          `Email "${params.email}" is already registered`,
        );
      }

      if (params.phoneNumber) {
        const existingPhone = await userRepo.findOne({
          where: { phoneNumber: params.phoneNumber },
        });
        if (existingPhone !== null) {
          throw new ConflictException(
            `Phone "${params.phoneNumber}" is already registered`,
          );
        }
      }

      const user = userRepo.create({
        email: normalizedEmail,
        phoneNumber: params.phoneNumber ?? null,
        fullName: params.fullName,
        profileImageUrl: null,
        profileImageSource: 'none',
        role: 'customer', // self-registration = customer only
        branchId: null,
        accountStatus: 'active',
        emailVerifiedAt: null,
        phoneVerifiedAt: null,
        tokenVersion: 0,
      });
      user.isProfileComplete = this.computeProfileComplete(user);

      const savedUser = await userRepo.save(user);

      const passwordHash = await hashPassword(params.password);
      const authAccount = authRepo.create({
        userId: savedUser.id,
        provider: 'email',
        providerAccountId: normalizedEmail,
        passwordHash,
      });
      await authRepo.save(authAccount);

      return savedUser;
    });
  }

  /**
   * OAuth signup/login — ALWAYS creates role='customer' if new user.
   * Existing users keep their current role.
   */
  async findOrCreateFromOAuth(
    profile: OAuthProfileData,
  ): Promise<{ user: UserEntity; isNewUser: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(UserEntity);
      const authRepo = manager.getRepository(AuthAccountEntity);

      // Case 1: provider account already linked
      const existingAuth = await authRepo.findOne({
        where: {
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
        },
      });
      if (existingAuth !== null) {
        existingAuth.accessToken = profile.accessToken;
        existingAuth.refreshToken = profile.refreshToken;
        existingAuth.tokenExpiresAt = profile.tokenExpiresAt;
        existingAuth.providerProfile = profile.rawProfile;
        await authRepo.save(existingAuth);

        const user = await userRepo.findOne({
          where: { id: existingAuth.userId },
        });
        if (user === null) {
          throw new NotFoundException('Linked user not found');
        }

        if (
          profile.profileImageUrl !== null &&
          (user.profileImageSource === 'oauth' ||
            user.profileImageSource === 'none')
        ) {
          user.profileImageUrl = profile.profileImageUrl;
          user.profileImageSource = 'oauth';
          await userRepo.save(user);
        }

        return { user, isNewUser: false };
      }

      // Case 2: email matches an existing user → link provider (role unchanged)
      if (profile.email) {
        const existingUser = await userRepo.findOne({
          where: { email: profile.email.toLowerCase() },
        });
        if (existingUser !== null) {
          const newAuth = authRepo.create({
            userId: existingUser.id,
            provider: profile.provider,
            providerAccountId: profile.providerAccountId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            tokenExpiresAt: profile.tokenExpiresAt,
            providerProfile: profile.rawProfile,
          });
          await authRepo.save(newAuth);

          if (existingUser.emailVerifiedAt === null) {
            existingUser.emailVerifiedAt = new Date();
          }

          if (
            profile.profileImageUrl !== null &&
            existingUser.profileImageSource === 'none'
          ) {
            existingUser.profileImageUrl = profile.profileImageUrl;
            existingUser.profileImageSource = 'oauth';
          }

          await userRepo.save(existingUser);
          return { user: existingUser, isNewUser: false };
        }
      }

      // Case 3: brand new user → always role='customer'
      const newUser = userRepo.create({
        email: profile.email ? profile.email.toLowerCase() : null,
        emailVerifiedAt: profile.email ? new Date() : null,
        phoneNumber: null,
        phoneVerifiedAt: null,
        fullName: profile.fullName,
        profileImageUrl: profile.profileImageUrl,
        profileImageSource: profile.profileImageUrl ? 'oauth' : 'none',
        role: 'customer',
        branchId: null,
        accountStatus: 'active',
        tokenVersion: 0,
      });
      newUser.isProfileComplete = this.computeProfileComplete(newUser);

      const savedUser = await userRepo.save(newUser);

      const newAuth = authRepo.create({
        userId: savedUser.id,
        provider: profile.provider,
        providerAccountId: profile.providerAccountId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        tokenExpiresAt: profile.tokenExpiresAt,
        providerProfile: profile.rawProfile,
      });
      await authRepo.save(newAuth);

      return { user: savedUser, isNewUser: true };
    });
  }

  async findEmailAuthAccount(
    email: string,
  ): Promise<{ user: UserEntity; authAccount: AuthAccountEntity } | null> {
    const authAccount = await this.authAccountRepository
      .createQueryBuilder('auth')
      .addSelect('auth.passwordHash')
      .leftJoinAndSelect('auth.user', 'user')
      .where('auth.provider = :provider', { provider: 'email' })
      .andWhere('auth.providerAccountId = :email', {
        email: email.toLowerCase(),
      })
      .getOne();

    if (authAccount === null || !authAccount.user) {
      return null;
    }

    return { user: authAccount.user, authAccount };
  }

  async addEmailPassword(userId: string, password: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user === null) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    if (user.email === null) {
      throw new BadRequestException(
        'Cannot add password: user has no email address',
      );
    }

    const existing = await this.authAccountRepository.findOne({
      where: { userId, provider: 'email' },
    });
    if (existing !== null) {
      throw new ConflictException('Email/password login is already set up');
    }

    const passwordHash = await hashPassword(password);
    const authAccount = this.authAccountRepository.create({
      userId,
      provider: 'email',
      providerAccountId: user.email,
      passwordHash,
    });
    await this.authAccountRepository.save(authAccount);
  }

  async changePassword(userId: string, newPassword: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const authRepo = manager.getRepository(AuthAccountEntity);
      const userRepo = manager.getRepository(UserEntity);

      const emailAuth = await authRepo.findOne({
        where: { userId, provider: 'email' },
      });

      if (emailAuth === null) {
        throw new NotFoundException(
          'User has no email/password account to change',
        );
      }

      emailAuth.passwordHash = await hashPassword(newPassword);
      await authRepo.save(emailAuth);

      await userRepo.increment({ id: userId }, 'tokenVersion', 1);
    });
  }

  async unlinkProvider(userId: string, provider: AuthProvider): Promise<void> {
    const allAccounts = await this.authAccountRepository.find({
      where: { userId },
    });

    if (allAccounts.length <= 1) {
      throw new BadRequestException('Cannot remove your only login method');
    }

    const account = allAccounts.find((a) => a.provider === provider);
    if (account === undefined) {
      throw new NotFoundException(`No ${provider} account linked to this user`);
    }

    await this.authAccountRepository.remove(account);
  }

  async findActiveUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id, accountStatus: 'active' },
      relations: ['branch'],
    });
  }

  async getTokenVersion(id: string): Promise<number | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'tokenVersion'],
    });
    return user?.tokenVersion ?? null;
  }

  async invalidateTokens(id: string): Promise<void> {
    await this.userRepository.increment({ id }, 'tokenVersion', 1);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  /**
   * Enforce the rules:
   *   cashier/manager → MUST have branchId
   *   customer/admin/super_admin → MUST NOT have branchId
   */
  /** There can be only one super_admin in the system. */
  private async assertNoOtherSuperAdmin(excludeId?: string): Promise<void> {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: 'super_admin' });
    if (excludeId) {
      qb.andWhere('user.id != :excludeId', { excludeId });
    }
    if ((await qb.getCount()) > 0) {
      throw new ConflictException('There can only be one Super Admin');
    }
  }

  private async validateRoleBranchCombination(
    role: UserRole,
    branchId: string | null,
  ): Promise<void> {
    if (BRANCH_REQUIRED_ROLES.includes(role)) {
      if (!branchId) {
        throw new BadRequestException(
          `Role "${role}" requires a branchId. Assign the user to a branch.`,
        );
      }
      const branch = await this.branchRepository.findOne({
        where: { id: branchId },
      });
      if (branch === null) {
        throw new BadRequestException(`Branch with ID ${branchId} not found`);
      }
    }

    if (BRANCH_FORBIDDEN_ROLES.includes(role) && branchId !== null) {
      throw new BadRequestException(
        `Role "${role}" cannot be assigned to a branch. Set branchId to null.`,
      );
    }
  }

  private computeProfileComplete(user: UserEntity): boolean {
    return (
      user.fullName !== null &&
      user.fullName.trim().length > 0 &&
      user.phoneNumber !== null &&
      user.phoneNumber.trim().length > 0
    );
  }

  private computeMissingFields(
    user: UserEntity,
  ): Array<'phoneNumber' | 'email' | 'fullName'> {
    const missing: Array<'phoneNumber' | 'email' | 'fullName'> = [];
    if (!user.fullName || user.fullName.trim().length === 0) {
      missing.push('fullName');
    }
    if (!user.phoneNumber || user.phoneNumber.trim().length === 0) {
      missing.push('phoneNumber');
    }
    return missing;
  }

  private async deleteAvatarFile(imageUrl: string): Promise<void> {
    try {
      if (!imageUrl || !imageUrl.startsWith('/upload/avatars/')) {
        return;
      }
      const filename = imageUrl.replace('/upload/avatars/', '');
      await this.deleteFileByFilename(filename);
    } catch (error) {
      console.error('Error deleting avatar file:', error);
    }
  }

  private async deleteFileByFilename(filename: string): Promise<void> {
    try {
      const filePath = path.join(AVATAR_UPLOAD_DIR, filename);
      await fs.unlink(filePath);
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }
      console.error('Error deleting file:', error);
    }
  }

  private toResponse(entity: UserEntity): UserResponse {
    const providers: AuthProvider[] =
      entity.authAccounts?.map((a) => a.provider) ?? [];

    const response: UserResponse = {
      id: entity.id,
      email: entity.email,
      emailVerifiedAt: entity.emailVerifiedAt,
      phoneNumber: entity.phoneNumber,
      phoneVerifiedAt: entity.phoneVerifiedAt,
      fullName: entity.fullName,
      profileImageUrl: entity.profileImageUrl,
      profileImageSource: entity.profileImageSource,
      role: entity.role,
      branchId: entity.branchId,
      accountStatus: entity.accountStatus,
      isProfileComplete: entity.isProfileComplete,
      missingFields: this.computeMissingFields(entity),
      linkedProviders: providers,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    if (entity.branch) {
      response.branch = {
        id: entity.branch.id,
        branchCode: entity.branch.branchCode,
        branchNameEn: entity.branch.branchNameEn,
        branchNameKm: entity.branch.branchNameKm,
      };
    }

    return response;
  }

  private async toResponseWithRelations(
    entity: UserEntity,
  ): Promise<UserResponse> {
    const withRelations = await this.userRepository.findOne({
      where: { id: entity.id },
      relations: ['authAccounts', 'branch'],
    });
    return this.toResponse(withRelations ?? entity);
  }
}
