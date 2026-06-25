import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateBadgeDto {
  @ApiProperty({ example: 'New' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ example: 'ថ្មី' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameKm!: string;

  @ApiProperty({ example: '#ec4899' })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: 'color must be a hex like #ec4899',
  })
  color!: string;

  @ApiPropertyOptional({
    description: 'Optional slug; auto-generated from the English name if omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  slug?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;
}
