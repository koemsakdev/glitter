import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  DiscountTarget,
  DiscountType,
} from '../entities/voucher.entity';

export class CreateVoucherDto {
  @ApiPropertyOptional({ description: 'Code (null = automatic promo)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  nameEn!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nameKm?: string;

  @ApiProperty({ enum: ['percent', 'fixed'] })
  @IsEnum(['percent', 'fixed'])
  discountType!: DiscountType;

  @ApiPropertyOptional({ enum: ['order', 'delivery'], default: 'order' })
  @IsOptional()
  @IsEnum(['order', 'delivery'])
  appliesTo?: DiscountTarget;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSpend?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxDiscount?: number | null;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  startAt?: string | null;

  @ApiPropertyOptional({ description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  endAt?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number | null;

  @ApiPropertyOptional({ description: 'Restrict to customers with no prior orders' })
  @IsOptional()
  @IsBoolean()
  firstOrderOnly?: boolean;

  @ApiPropertyOptional({ description: 'Restrict to accounts newer than N days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  newAccountDays?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
