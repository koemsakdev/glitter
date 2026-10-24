import {
  BadRequestException,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { BulkCreateVariantsDto } from './dto/bulk-create-variants.dto';
import { ProductVariantsService } from './product-variant.service';
import {
  ProductVariantBulkResponseDto,
  ProductVariantDetailResponseDto,
  ProductVariantListResponseDto,
  ProductVariantOptionsResponseDto,
} from './dto/product-variant-response.dto';
import {
  ProductVariantBulkResponse,
  ProductVariantDetailResponse,
  ProductVariantListResponse,
  ProductVariantOptionsResponse,
} from './types/product-variant-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles, RequirePermission } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Product Variants')
@ApiBearerAuth()
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @RequirePermission('products.edit')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a product variant',
    description:
      'Creates a single size/color/SKU combination. If the product currently has only a default variant, it will be replaced by this real variant automatically.',
  })
  @ApiBody({ type: CreateProductVariantDto })
  @ApiResponse({
    status: 201,
    type: ProductVariantDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  async create(
    @Body() dto: CreateProductVariantDto,
  ): Promise<ProductVariantDetailResponse> {
    return this.variantsService.create(dto);
  }

  @RequirePermission('products.edit')
  @Post('bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create multiple variants at once',
    description:
      'Bulk-creates a set of variants. Replaces the auto-default variant if the product still has one.',
  })
  @ApiBody({ type: BulkCreateVariantsDto })
  @ApiResponse({
    status: 201,
    type: ProductVariantBulkResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  async createBulk(
    @Body() dto: BulkCreateVariantsDto,
  ): Promise<ProductVariantBulkResponse> {
    return this.variantsService.createBulk(dto);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all variants (admin)' })
  @ApiResponse({ status: 200, type: ProductVariantListResponseDto })
  async findAll(): Promise<ProductVariantListResponse> {
    return this.variantsService.findAll();
  }

  @Get('product/:productId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get variants by product',
    description:
      'Returns all variants for a product. Includes effectivePrice (override or parent product price).',
  })
  @Public()
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 200, type: ProductVariantListResponseDto })
  async findByProduct(
    @Param('productId') productId: string,
  ): Promise<ProductVariantListResponse> {
    return this.variantsService.findByProduct(productId);
  }

  /**
   * Get structured color/size options for the storefront picker
   * GET /api/product-variants/product/:productId/options
   */
  @Get('product/:productId/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get color + size options for a product',
    description:
      'Returns variants grouped for the storefront picker. Each color lists its available sizes, and each size lists its available colors. Returns empty arrays with hasSingleVariant:true for single-variant products.',
  })
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({
    status: 200,
    description: 'Structured variant options',
    type: ProductVariantOptionsResponseDto,
  })
  @Public()
  async findOptions(
    @Param('productId') productId: string,
  ): Promise<ProductVariantOptionsResponse> {
    return this.variantsService.findOptions(productId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'manager', 'cashier')
  @Get('sku/:variantSku')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get variant by SKU' })
  @ApiParam({ name: 'variantSku', type: String })
  @ApiResponse({ status: 200, type: ProductVariantDetailResponseDto })
  async findBySku(
    @Param('variantSku') variantSku: string,
  ): Promise<ProductVariantDetailResponse> {
    return this.variantsService.findBySku(variantSku);
  }

  @Public()
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get variant by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: ProductVariantDetailResponseDto })
  async findOne(
    @Param('id') id: string,
  ): Promise<ProductVariantDetailResponse> {
    return this.variantsService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @RequirePermission('products.edit')
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a variant' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateProductVariantDto })
  @ApiResponse({ status: 200, type: ProductVariantDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
  ): Promise<ProductVariantDetailResponse> {
    return this.variantsService.update(id, dto);
  }

  @RequirePermission('products.edit')
  @Patch(':id/adjust-stock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adjust variant stock by delta',
    description:
      'Positive delta adds, negative subtracts. Prevents negative stock.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'delta', type: Number, required: true })
  @ApiResponse({ status: 200, type: ProductVariantDetailResponseDto })
  async adjustStock(
    @Param('id') id: string,
    @Query('delta') delta: string,
  ): Promise<ProductVariantDetailResponse> {
    const deltaNum = parseInt(delta, 10);
    if (isNaN(deltaNum)) {
      throw new BadRequestException('delta must be a valid integer');
    }
    return this.variantsService.adjustStock(id, deltaNum);
  }

  @RequirePermission('products.edit')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a variant',
    description:
      'Deletes a variant. Rejected if it is the only default variant of a single-variant product. If this deletes the last real variant, the default is auto-recreated.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    return this.variantsService.delete(id);
  }
}
