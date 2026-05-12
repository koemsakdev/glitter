import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { CategoryType } from '../entities/category.entity';

export class UpdateCategoryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameEn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nameKm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionKm?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({ required: false, enum: ['main', 'sub', 'featured'] })
  @IsOptional()
  @IsEnum(['main', 'sub', 'featured'])
  categoryType?: CategoryType;

  /**
   * When `true` and no new icon file is uploaded, the existing icon
   * is removed from disk and `iconUrl` is set to null.
   */
  @ApiProperty({
    required: false,
    description: 'Set to true to remove the existing icon',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  clearIcon?: boolean;
}
