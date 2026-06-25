import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreatePageDto {
  @ApiProperty({
    description: 'URL slug (served at /<slug>)',
    example: 'about',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'About us' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleEn!: string;

  @ApiProperty({ example: 'អំពីយើង' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titleKm!: string;

  @ApiPropertyOptional({ description: 'Body text (English)' })
  @IsOptional()
  @IsString()
  bodyEn?: string;

  @ApiPropertyOptional({ description: 'Body text (Khmer)' })
  @IsOptional()
  @IsString()
  bodyKm?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPublished?: boolean;
}
