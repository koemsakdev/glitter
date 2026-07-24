import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as path from 'path';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { createDiskStorage } from '../common/helpers/multer.helper';
import {
  assertOwnerOrAdmin,
  isAdmin,
} from '../common/helpers/ownership.helper';
import { CreateUserDto } from './dto/create-user.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './user.service';
import { UserEntity } from './entities/user.entity';
import {
  UserDetailResponseDto,
  UserListResponseDto,
} from './dto/user-response.dto';
import {
  UserDetailResponse,
  UserListResponse,
} from './types/user-response.type';

const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const avatarStorage = createDiskStorage(AVATAR_UPLOAD_DIR);

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`),
      false,
    );
  }
  callback(null, true);
};

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * ADMIN ONLY — create users (staff, walk-in customers, etc.)
   * Customers self-register via POST /api/auth/register instead.
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a user (admin only)',
    description:
      'Admin endpoint. For customer self-signup, use POST /api/auth/register. Creating staff roles requires initialPassword.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserDetailResponseDto })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<UserDetailResponse> {
    // Only super_admin can create other super_admin or admin
    if (
      (dto.role === 'super_admin' || dto.role === 'admin') &&
      currentUser.role !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Only super_admin can create admin or super_admin accounts',
      );
    }
    return this.usersService.create(dto);
  }

  /**
   * ADMIN ONLY — list users
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List users (admin only)',
    description: 'Managers, admins, super_admins can browse users.',
  })
  @ApiResponse({ status: 200, type: UserListResponseDto })
  async findAll(@Query() query: UserQueryDto): Promise<UserListResponse> {
    return this.usersService.findAll(query);
  }

  /**
   * ADMIN ONLY — find user by email
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @Get('email/:email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Find user by email (admin only)' })
  @ApiParam({ name: 'email', type: String })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  async findByEmail(
    @Param('email') email: string,
  ): Promise<UserDetailResponse> {
    return this.usersService.findByEmail(email);
  }

  /**
   * Users can view their OWN profile. Admins can view anyone's.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Find user by ID',
    description: 'Users can view their own profile. Admins can view anyone.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  @ApiResponse({ status: 403, description: 'Can only view your own profile' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<UserDetailResponse> {
    assertOwnerOrAdmin(currentUser, id, 'You can only view your own profile');
    return this.usersService.findOne(id);
  }

  /**
   * Users can update their OWN profile. Admins can update anyone.
   * Only admins can change role/branchId/accountStatus.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update profile fields',
    description:
      'Users update their own profile. Admins update anyone. role/branchId/accountStatus are admin-only fields.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<UserDetailResponse> {
    assertOwnerOrAdmin(currentUser, id, 'You can only update your own profile');

    // Non-admins cannot modify elevated fields
    if (!isAdmin(currentUser)) {
      if (
        dto.role !== undefined ||
        dto.branchId !== undefined ||
        dto.accountStatus !== undefined
      ) {
        throw new ForbiddenException(
          'Only admins can change role, branch, or account status',
        );
      }
    }

    // Only super_admin can promote someone to admin or super_admin
    if (
      (dto.role === 'admin' || dto.role === 'super_admin') &&
      currentUser.role !== 'super_admin'
    ) {
      throw new ForbiddenException(
        'Only super_admin can assign admin or super_admin roles',
      );
    }

    // You cannot change your OWN role or account status — that prevents
    // self-demotion / self-suspension and locking yourself out. Use another
    // admin, or the Profile page for your own name/email/phone.
    if (currentUser.id === id) {
      if (dto.role !== undefined && dto.role !== currentUser.role) {
        throw new ForbiddenException('You cannot change your own role');
      }
      if (
        dto.accountStatus !== undefined &&
        dto.accountStatus !== currentUser.accountStatus
      ) {
        throw new ForbiddenException(
          'You cannot change your own account status',
        );
      }
    }

    return this.usersService.update(id, dto);
  }

  /**
   * Users can upload their OWN avatar. Admins can upload for anyone.
   */
  @Patch(':id/avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      fileFilter,
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or replace avatar' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
      required: ['avatar'],
    },
  })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() avatar: Express.Multer.File,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<UserDetailResponse> {
    assertOwnerOrAdmin(currentUser, id, 'You can only change your own avatar');

    if (!avatar) {
      throw new BadRequestException('Avatar file is required');
    }
    if (avatar.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }
    return this.usersService.uploadAvatar(id, avatar);
  }

  /**
   * Users can remove their OWN avatar. Admins can remove anyone's.
   */
  @Delete(':id/avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove profile avatar' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: UserDetailResponseDto })
  async removeAvatar(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<UserDetailResponse> {
    assertOwnerOrAdmin(currentUser, id, 'You can only change your own avatar');
    return this.usersService.removeAvatar(id);
  }

  /**
   * ADMIN ONLY — set or reset a user's login password (e.g. to give existing
   * staff credentials, or reset a forgotten password).
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @Patch(':id/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Set or reset a user's login password (admin only)",
    description:
      'Creates the email/password sign-in if the user has none, or replaces ' +
      'the existing one. The user must have an email. Existing sessions are ' +
      'invalidated.',
  })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: SetPasswordDto })
  async setPassword(
    @Param('id') id: string,
    @Body() dto: SetPasswordDto,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<{ ok: true }> {
    await this.usersService.setUserPassword(id, dto.password, currentUser);
    return { ok: true };
  }

  /**
   * ADMIN ONLY — force a user to log out from all devices
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @Post(':id/invalidate-tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force logout from all devices (admin only)',
    description: 'Admin action. For self-logout, use POST /api/auth/logout.',
  })
  @ApiParam({ name: 'id', type: String })
  async invalidateTokens(@Param('id') id: string): Promise<{ ok: true }> {
    await this.usersService.invalidateTokens(id);
    return { ok: true };
  }

  /**
   * ADMIN ONLY — soft delete
   */
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a user (admin only)' })
  @ApiParam({ name: 'id', type: String })
  async delete(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.usersService.softDelete(id);
  }

  /**
   * SUPER ADMIN ONLY — hard delete (irreversible)
   */
  @UseGuards(RolesGuard)
  @Roles('super_admin')
  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Permanently delete a user (super_admin only, DESTRUCTIVE)',
  })
  @ApiParam({ name: 'id', type: String })
  async hardDelete(
    @Param('id') id: string,
    @CurrentUser() currentUser: UserEntity,
  ): Promise<void> {
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    await this.usersService.hardDelete(id);
  }
}
