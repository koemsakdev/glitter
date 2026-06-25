import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type {
  BannerEvent,
  BannerStatus,
  BannerType,
} from '../entities/banner.entity';
import {
  BANNER_PLACEMENTS,
  type BannerPlacement,
} from '../entities/banner-placement.entity';

const TYPES: BannerType[] = ['hero', 'promo', 'category', 'seasonal'];
const EVENTS: BannerEvent[] = [
  'none',
  'new_year',
  'khmer_new_year',
  'valentine',
  'black_friday',
];
const STATUSES: BannerStatus[] = [
  'active',
  'inactive',
  'scheduled',
  'archived',
];

export class CreateBannerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleKm?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  imageUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  imageAltText?: string;

  @ApiPropertyOptional({
    description: 'Relative path (e.g. /products) or an http(s) URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/|https?:\/\/)/, {
    message:
      'linkUrl must be a relative path (e.g. /products) or an http(s) URL',
  })
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptionKm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonLabelEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  buttonLabelKm?: string;

  @ApiPropertyOptional({ enum: TYPES })
  @IsOptional()
  @IsEnum(TYPES)
  bannerType?: BannerType;

  @ApiPropertyOptional({ enum: EVENTS })
  @IsOptional()
  @IsEnum(EVENTS)
  bannerEvent?: BannerEvent;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: BannerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional({ enum: BANNER_PLACEMENTS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(BANNER_PLACEMENTS, { each: true })
  placements?: BannerPlacement[];
}
