import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { AddressType } from '../entities/address.entity';

/**
 * userId is NOT updatable — addresses are permanently tied to their owner.
 */
export class UpdateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  recipientName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^(\+?855|0)\d{7,10}$/)
  recipientPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  commune?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  village?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  streetAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  landmark?: string;

  @ApiPropertyOptional({ enum: ['shipping', 'billing', 'both'] })
  @IsOptional()
  @IsEnum(['shipping', 'billing', 'both'])
  addressType?: AddressType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ description: 'Reference photo URL (served path)' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({
    description: 'Up to 5 reference photo URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];
}
