import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import type { BrandStatus } from '../entities/brand.entity';

export class UpdateBrandDto {
  @ApiProperty({ required: false, example: 'gucci' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false, example: 'Gucci' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: 'https://www.gucci.com' })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: BrandStatus;
  @ApiProperty({
    required: false,
    description: 'Set to true to remove the existing logo',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  clearLogo?: boolean;
}
