import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductBadgeDto } from './dto/create-product-badge.dto';
import { UpdateProductBadgeDto } from './dto/update-product-badge.dto';
import { SetProductBadgesDto } from './dto/set-product-badges.dto';
import { ProductBadgesService } from './product-badge.service';
import {
  ProductBadgeDetailResponseDto,
  ProductBadgeListResponseDto,
} from './dto/product-badge-response.dto';
import {
  ProductBadgeDetailResponse,
  ProductBadgeListResponse,
} from './types/product-badge-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Product Badges')
@ApiBearerAuth()
@Controller('product-badges')
export class ProductBadgesController {
  constructor(private readonly badgesService: ProductBadgesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a badge for a product',
    description:
      'Adds a badge (NEW, SALE, BESTSELLER, etc.) to a product. Defaults for label and color are applied per type if not specified. One badge of each type per product.',
  })
  @ApiBody({
    type: CreateProductBadgeDto,
    examples: {
      new: {
        summary: 'Mark as new',
        value: {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          badgeType: 'new',
        },
      },
      saleWithDates: {
        summary: 'Time-limited sale badge',
        value: {
          productId: '550e8400-e29b-41d4-a716-446655440000',
          badgeType: 'sale',
          badgeLabelEn: '-30% OFF',
          badgeLabelKm: 'បញ្ចុះ ៣០%',
          badgeIconColor: '#FF3B30',
          badgeStartDate: '2026-05-01T00:00:00.000Z',
          badgeEndDate: '2026-05-31T23:59:59.000Z',
        },
      },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiResponse({ status: 201, type: ProductBadgeDetailResponseDto })
  async create(
    @Body() dto: CreateProductBadgeDto,
  ): Promise<ProductBadgeDetailResponse> {
    return this.badgesService.create(dto);
  }

  @Put('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Replace a product’s badge set (atomic)',
    description:
      'Replaces all of a product’s badges with the given list of badge type slugs. Used by the product editor so the stored set matches exactly.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'productId', type: String })
  @ApiBody({ type: SetProductBadgesDto })
  @ApiResponse({ status: 200, type: ProductBadgeListResponseDto })
  async setForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetProductBadgesDto,
  ): Promise<ProductBadgeListResponse> {
    return this.badgesService.setForProduct(productId, dto.badgeTypes);
  }

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all badges for a product (admin)',
    description:
      'Returns ALL badges for a product, including expired and scheduled future ones. Use /active for storefront display.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 200, type: ProductBadgeListResponseDto })
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ProductBadgeListResponse> {
    return this.badgesService.findByProduct(productId);
  }

  @Get('product/:productId/active')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get currently active badges for a product (storefront)',
    description:
      'Returns only badges whose start/end date window includes the current time. Sorted by display priority.',
  })
  @Public()
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 200, type: ProductBadgeListResponseDto })
  async findActiveByProduct(
    @Param('productId') productId: string,
  ): Promise<ProductBadgeListResponse> {
    return this.badgesService.findActiveByProduct(productId);
  }

  /**
   * Cleanup expired badges (for cron jobs / admin cleanup)
   * POST /product-badges/cleanup-expired
   */
  @Post('cleanup-expired')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove expired badges',
    description:
      'Deletes all badges where badgeEndDate is in the past. Useful for scheduled cleanup jobs.',
  })
  @ApiResponse({
    status: 200,
    description: 'Count of removed badges',
    schema: { example: { removed: 5 } },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async cleanupExpired(): Promise<{ removed: number }> {
    return this.badgesService.cleanupExpired();
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a badge by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductBadgeDetailResponseDto })
  async findOne(@Param('id') id: string): Promise<ProductBadgeDetailResponse> {
    return this.badgesService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a badge' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductBadgeDto })
  @ApiResponse({ status: 200, type: ProductBadgeDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductBadgeDto,
  ): Promise<ProductBadgeDetailResponse> {
    return this.badgesService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a badge' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    return this.badgesService.delete(id);
  }
}
