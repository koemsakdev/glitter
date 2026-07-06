import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import type { ProductStatus, ProductType } from '../entities/product.entity';

export type ProductSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'price'
  | 'nameEn'
  | 'averageRating';
export type SortOrder = 'ASC' | 'DESC';

export class ProductQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (default: 1)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page (default: 10)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by category UUID',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by brand UUID',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Filter by multiple brand UUIDs (comma-separated)',
  })
  @IsOptional()
  @IsString()
  brandIds?: string;

  @ApiPropertyOptional({
    description: 'Filter to products with inventory at this branch UUID',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ['draft', 'active', 'out_of_stock', 'discontinued', 'archived'],
  })
  @IsOptional()
  @IsEnum(['draft', 'active', 'out_of_stock', 'discontinued', 'archived'])
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Filter by product type',
    enum: ['standard', 'featured', 'limited', 'exclusive'],
  })
  @IsOptional()
  @IsEnum(['standard', 'featured', 'limited', 'exclusive'])
  productType?: ProductType;

  @ApiPropertyOptional({
    description: 'Search by name (EN or KM) or SKU',
    example: 'marmont',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Minimum price filter',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum price filter',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'price', 'nameEn', 'averageRating'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'price', 'nameEn', 'averageRating'])
  sortBy?: ProductSortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: SortOrder;
}
