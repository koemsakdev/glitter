import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AccountStatus, UserRole } from '../entities/user.entity';

/**
 * Update DTO for profile fields.
 * role and branchId are admin-only — enforce this in the controller/guard layer.
 */
export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: 'dara',
    description:
      'Dashboard sign-in name for staff: 3–30 lowercase letters, numbers, . _ -',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9._-]{3,30}$/, {
    message:
      'username must be 3–30 characters: lowercase letters, numbers, dot, underscore or dash',
  })
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(\+?855|0)\d{7,10}$/)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({
    enum: ['customer', 'cashier', 'manager', 'admin'],
    description: 'Admin-only. Changing role may require branchId adjustment.',
  })
  @IsOptional()
  @IsIn(['customer', 'cashier', 'manager', 'admin'])
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Admin-only. Set to null to unassign from branch.',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  accountStatus?: AccountStatus;
}
