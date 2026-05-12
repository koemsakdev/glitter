import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { CategoryType } from '../entities/category.entity';

export class CreateCategoryDto {
  @ApiProperty({ example: 'designer-bags' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  slug: string;

  @ApiProperty({ example: 'Designer Bags' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nameEn: string;

  @ApiProperty({ example: 'កាបូបលម្អប្រដាប់' })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  nameKm: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  descriptionKm?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiProperty({
    required: false,
    enum: ['main', 'sub', 'featured'],
    default: 'main',
  })
  @IsOptional()
  @IsEnum(['main', 'sub', 'featured'])
  categoryType?: CategoryType;
}
