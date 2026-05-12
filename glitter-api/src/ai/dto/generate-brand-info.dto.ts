import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export type AiBrandField = 'websiteUrl' | 'description';
export type AiCategoryField = 'description';

export class GenerateBrandInfoDto {
  @ApiProperty({
    description: 'Brand name to use for AI generation',
    example: 'Gucci',
  })
  @IsString()
  @MinLength(1)
  declare name: string;

  @ApiProperty({
    description: 'Which field to generate',
    enum: ['websiteUrl', 'description'],
    example: 'description',
  })
  @IsString()
  @IsIn(['websiteUrl', 'description'])
  declare field: AiBrandField;

  @ApiProperty({
    description: 'Output language for description (ignored for websiteUrl)',
    enum: ['en', 'km'],
    required: false,
    example: 'en',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'km'])
  declare language?: 'en' | 'km';
}

export class GenerateCategoryInfoDto {
  @ApiProperty({ description: 'Category name', example: 'Designer Bags' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({ enum: ['description'] })
  @IsString()
  @IsIn(['description'])
  field: AiCategoryField;

  @ApiProperty({ enum: ['en', 'km'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'km'])
  language?: 'en' | 'km';
}
