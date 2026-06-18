import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { AccountStatus, UserRole } from '../entities/user.entity';
import type { AuthProvider } from '../entities/auth-account.entity';

export class UserQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by email, phone, or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'deleted'] })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  accountStatus?: AccountStatus;

  @ApiPropertyOptional({
    enum: ['customer', 'cashier', 'manager', 'admin', 'super_admin'],
    description: 'Filter by role',
  })
  @IsOptional()
  @IsEnum(['customer', 'cashier', 'manager', 'admin', 'super_admin'])
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Filter by assigned branch UUID' })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Only staff-role accounts (exclude customers)',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  staffOnly?: boolean;

  @ApiPropertyOptional({
    enum: ['email', 'google', 'facebook', 'apple', 'telegram'],
    description: 'Filter by linked provider',
  })
  @IsOptional()
  @IsEnum(['email', 'google', 'facebook', 'apple', 'telegram'])
  provider?: AuthProvider;
}
