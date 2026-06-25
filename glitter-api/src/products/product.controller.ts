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
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductsService } from './product.service';
import {
  ProductDetailResponseDto,
  ProductListResponseDto,
} from './dto/product-response.dto';
import {
  ProductDetailResponse,
  ProductListResponse,
} from './types/product-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a product with bilingual support. A default variant (null size/color, 0 stock) is auto-created. Use variant endpoints to manage stock and size/color options.',
  })
  @ApiBody({ type: CreateProductDto })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  async create(@Body() dto: CreateProductDto): Promise<ProductDetailResponse> {
    return this.productsService.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all products',
    description:
      'Paginated list with filters, search, and sort. Includes category, brand, images, and variants.',
  })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: ProductListResponseDto,
  })
  @Public()
  async findAll(@Query() query: ProductQueryDto): Promise<ProductListResponse> {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get('best-selling')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get best-selling products',
    description: 'Top active products by units sold (falls back to recent).',
  })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  async findBestSelling(
    @Query('limit') limit?: string,
  ): Promise<ProductListResponse> {
    const n = Math.min(Math.max(parseInt(limit ?? '8', 10) || 8, 1), 24);
    return this.productsService.findBestSelling(n);
  }

  /**
   * Bulk sync stock across all products.
   * Useful one-time after data imports or manual DB fixes.
   * POST /api/products/sync-stock
   */
  @Post('sync-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync totalStock for ALL products',
    description:
      'Recomputes product.totalStock from variant sums for every product in the DB. Returns the count of products that needed correction. Use after data imports or manual DB changes to fix drift.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns number of products updated',
    schema: {
      example: { updated: 3 },
    },
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  async syncAllStock(): Promise<{ updated: number }> {
    return this.productsService.syncAllStock();
  }

  @Public()
  @Get('slug/:slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product by slug' })
  @ApiParam({ name: 'slug', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  async findBySlug(
    @Param('slug') slug: string,
  ): Promise<ProductDetailResponse> {
    return this.productsService.findBySlug(slug);
  }

  @Public()
  @Get('sku/:sku')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product by SKU' })
  @ApiParam({ name: 'sku', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  async findBySku(@Param('sku') sku: string): Promise<ProductDetailResponse> {
    return this.productsService.findBySku(sku);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  async findOne(@Param('id') id: string): Promise<ProductDetailResponse> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a product',
    description:
      'Partial update. Note: totalStock is not editable here — it is derived from variants. Use variant endpoints to change stock.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductDetailResponse> {
    return this.productsService.update(id, dto);
  }

  /**
   * Resync totalStock for a specific product.
   * PATCH /api/products/:id/sync-stock
   */
  @Patch(':id/sync-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resync product.totalStock from its variants',
    description:
      'Recomputes product.totalStock as SUM(variant.quantityInStock). Useful if totalStock has drifted due to manual DB changes or legacy data.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async syncStock(@Param('id') id: string): Promise<ProductDetailResponse> {
    return this.productsService.syncStock(id);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive a product',
    description: 'Sets status to archived without deleting',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductDetailResponseDto })
  async archive(@Param('id') id: string): Promise<ProductDetailResponse> {
    return this.productsService.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a product',
    description: 'Permanently removes the product and cascades to its variants',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  async delete(@Param('id') id: string): Promise<void> {
    return this.productsService.delete(id);
  }
}
