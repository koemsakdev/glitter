import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Public review submission (guest — name based until accounts exist). */
export class CreateReviewDto {
  @ApiProperty({ description: 'Product being reviewed' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'Sothea' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reviewerName!: string;

  @ApiProperty({ description: 'Star rating 1–5', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleKm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentEn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  commentKm?: string;

  @ApiPropertyOptional({
    description: 'Customer-uploaded photo URLs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  imageUrls?: string[];
}
