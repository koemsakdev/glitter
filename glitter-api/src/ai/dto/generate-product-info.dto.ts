import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type AiProductField = 'description' | 'details';

export class GenerateProductInfoDto {
  @ApiProperty({
    description: 'Product name (in the target language)',
    example: 'GG Marmont Small Shoulder Bag',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Brand name for context',
    example: 'Gucci',
  })
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional({
    description: 'Category name for context',
    example: 'Bags',
  })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiProperty({
    description: 'Which field to generate',
    enum: ['description', 'details'],
    example: 'description',
  })
  @IsEnum(['description', 'details'])
  field!: AiProductField;

  @ApiProperty({
    description: 'Target language',
    enum: ['en', 'km'],
    example: 'en',
  })
  @IsEnum(['en', 'km'])
  language!: 'en' | 'km';
}
