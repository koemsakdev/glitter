import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import type { MenuLocation } from '../entities/menu-item.entity';

export class CreateMenuItemDto {
  @ApiProperty({ description: 'Label (English)', example: 'Home' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  labelEn!: string;

  @ApiProperty({ description: 'Label (Khmer)', example: 'ទំព័រដើម' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  labelKm!: string;

  @ApiProperty({ description: 'Link target', example: '/products' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url!: string;

  @ApiPropertyOptional({
    description: 'Where the link appears',
    enum: ['header', 'footer'],
    default: 'header',
  })
  @IsOptional()
  @IsEnum(['header', 'footer'])
  location?: MenuLocation;

  @ApiPropertyOptional({
    description: 'Parent menu item id (for a sub-link), or null',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Sort order', default: 0 })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined || value === null ? undefined : Number(value),
  )
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    description: 'Visible on the storefront',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Open link in a new tab',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  openInNewTab?: boolean;
}
