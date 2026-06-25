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
  Min,
} from 'class-validator';
import type { AdStatus, AdType } from '../entities/advertisement.entity';
import {
  PLACEMENT_LOCATIONS,
  type PlacementLocation,
} from '../entities/ad-placement.entity';

const AD_TYPES: AdType[] = ['banner', 'popup', 'inline', 'sidebar'];
const AD_STATUSES: AdStatus[] = ['active', 'inactive', 'scheduled', 'archived'];

export class CreateAdvertisementDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleEn!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titleKm!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contentKm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Relative storefront path (e.g. /products) or an http(s) URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^(\/|https?:\/\/)/, {
    message:
      'linkUrl must be a relative path (e.g. /products) or an http(s) URL',
  })
  linkUrl?: string;

  @ApiPropertyOptional({ enum: AD_TYPES })
  @IsOptional()
  @IsEnum(AD_TYPES)
  adType?: AdType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayFrequency?: number;

  @ApiPropertyOptional({ enum: AD_STATUSES })
  @IsOptional()
  @IsEnum(AD_STATUSES)
  status?: AdStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  endDate?: string;

  @ApiPropertyOptional({ enum: PLACEMENT_LOCATIONS, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PLACEMENT_LOCATIONS, { each: true })
  placements?: PlacementLocation[];
}
