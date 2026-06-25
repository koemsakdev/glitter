import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import type { BadgeType } from '../entities/product-badge.entity';

export class CreateProductBadgeDto {
  @ApiProperty({
    description: 'Product UUID (must exist)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({
    description: 'Badge slug (from the badges catalog)',
    example: 'new',
  })
  @IsString()
  @MaxLength(50)
  badgeType!: BadgeType;

  @ApiPropertyOptional({
    description:
      'Custom English label (overrides the default for the badge type)',
    example: 'Just Arrived',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeLabelEn?: string;

  @ApiPropertyOptional({
    description: 'Custom Khmer label',
    example: 'ទើបតែមកដល់',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  badgeLabelKm?: string;

  @ApiPropertyOptional({
    description: 'Badge color hex code (#RRGGBB)',
    example: '#FF3B30',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'badgeIconColor must be a valid hex color (e.g., #FF3B30)',
  })
  badgeIconColor?: string;

  @ApiPropertyOptional({
    description:
      'When the badge should start appearing. Leave null for immediately.',
    example: '2026-05-01T00:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  badgeStartDate?: Date;

  @ApiPropertyOptional({
    description:
      'When the badge should stop appearing. Leave null for indefinite.',
    example: '2026-05-31T23:59:59.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  badgeEndDate?: Date;
}
