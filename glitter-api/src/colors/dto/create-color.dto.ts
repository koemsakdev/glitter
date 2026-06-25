import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateColorDto {
  @ApiProperty({ example: 'Red' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameEn!: string;

  @ApiProperty({ example: 'ក្រហម' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nameKm!: string;

  @ApiProperty({ example: '#ef4444' })
  @IsString()
  @Matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, {
    message: 'hex must be a color like #ef4444',
  })
  hex!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  displayOrder?: number;
}
