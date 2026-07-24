import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { AccountStatus, UserRole } from '../entities/user.entity';

/**
 * Admin endpoint for creating users.
 *
 * Roles:
 *   - 'customer' (default)     — regular shopper. branchId should be null.
 *   - 'cashier' or 'manager'   — staff member. branchId is REQUIRED.
 *   - 'admin' or 'super_admin' — system admin. branchId should be null.
 *
 * Self-registration via POST /api/auth/register always creates role='customer'.
 * Only admins/super_admins can use this endpoint to create elevated roles.
 */
export class CreateUserDto {
  @ApiPropertyOptional({
    example: 'customer@example.com',
    description: 'Optional — some social sign-ups may not provide one',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    example: '+85512345678',
    description: 'Optional at creation, required before ordering',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(\+?855|0)\d{7,10}$/, {
    message:
      'phoneNumber must be a valid Cambodian number (e.g., +85512345678 or 012345678)',
  })
  phoneNumber?: string;

  @ApiProperty({ example: 'Koemsak Sovann' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fullName!: string;

  @ApiPropertyOptional({
    enum: ['customer', 'cashier', 'manager', 'admin', 'super_admin'],
    default: 'customer',
    description:
      'User role. Defaults to "customer". Setting staff/admin roles requires admin-level permissions.',
  })
  @IsOptional()
  @IsEnum(['customer', 'cashier', 'manager', 'admin', 'super_admin'])
  role?: UserRole;

  @ApiPropertyOptional({
    description:
      'Branch UUID. Required when role is "cashier" or "manager". Must be null for customers/admins.',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'deleted'])
  accountStatus?: AccountStatus;

  @ApiPropertyOptional({
    description:
      'Initial login password for a staff member. Requires an email — ' +
      'creates the email/password sign-in so the staff can log into the dashboard.',
    minLength: 8,
    maxLength: 128,
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
