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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateInventoryBranchDto } from './dto/create-inventory-branch.dto';
import { UpdateInventoryBranchDto } from './dto/update-inventory-branch.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { InventoryBranchService } from './inventory-branch.service';
import {
  BranchInventorySummaryResponseDto,
  InventoryBranchDetailResponseDto,
  InventoryBranchListResponseDto,
  ProductAvailabilityResponseDto,
} from './dto/inventory-branch-response.dto';
import {
  BranchInventoryGroupedResponse,
  BranchInventorySummaryResponse,
  InventoryBranchDetailResponse,
  InventoryBranchListResponse,
  InventoryBranchResponse,
  ProductAvailabilityResponse,
} from './types/inventory-branch-response.type';
import { UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Inventory Branch')
@ApiBearerAuth()
@Controller('inventory-branch')
export class InventoryBranchController {
  constructor(private readonly service: InventoryBranchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an inventory record',
    description:
      'Creates a stock record for a variant at a specific branch. One variant can only have one record per branch.',
  })
  @ApiBody({ type: CreateInventoryBranchDto })
  @ApiResponse({
    status: 201,
    type: InventoryBranchDetailResponseDto,
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  async create(
    @Body() dto: CreateInventoryBranchDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.create(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all inventory records (paginated, filterable)',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'productVariantId', required: false, type: String })
  @ApiResponse({ status: 200, type: InventoryBranchListResponseDto })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('branchId') branchId?: string,
    @Query('productVariantId') productVariantId?: string,
  ): Promise<InventoryBranchListResponse> {
    return this.service.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      branchId,
      productVariantId,
    );
  }

  /**
   * KEY ENDPOINT FOR YOUR SHOP:
   * "For this Gucci bag, which branches have it?"
   * GET /inventory-branch/product/:productId/availability
   */
  @Get('product/:productId/availability')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get product availability across all branches',
    description:
      'Returns where a product is stocked and in which size/color/quantity at each branch. This is the endpoint the storefront uses for "Check store availability" and the admin uses to see stock distribution.',
  })
  @Public()
  @ApiParam({ name: 'productId', type: String })
  @ApiResponse({ status: 200, type: ProductAvailabilityResponseDto })
  async getProductAvailability(
    @Param('productId') productId: string,
  ): Promise<ProductAvailabilityResponse> {
    return this.service.getProductAvailability(productId);
  }

  /**
   * All stock at one branch (across all variants/products)
   * GET /inventory-branch/branch/:branchId
   */
  @Get('branch/:branchId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get inventory at a branch, grouped by product (paginated)',
    description:
      'Returns one page of products stocked at this branch, each with its variant rows and primary image. Supports search over product name/SKU and variant SKU.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiParam({ name: 'branchId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findByBranch(
    @Param('branchId') branchId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ): Promise<BranchInventoryGroupedResponse> {
    return this.service.findByBranch(
      branchId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      search,
    );
  }

  /**
   * Summary stats for a branch
   * GET /inventory-branch/branch/:branchId/summary
   */
  @Get('branch/:branchId/summary')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get branch inventory summary',
    description:
      'Totals: how many variants stocked, total units available/reserved/damaged.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiParam({ name: 'branchId', type: String })
  @ApiResponse({ status: 200, type: BranchInventorySummaryResponseDto })
  async getBranchSummary(
    @Param('branchId') branchId: string,
  ): Promise<BranchInventorySummaryResponse> {
    return this.service.getBranchSummary(branchId);
  }

  /**
   * All stock for one variant across all branches
   * GET /inventory-branch/variant/:variantId
   */
  @Get('variant/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get inventory for a variant across all branches',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiParam({ name: 'variantId', type: String })
  @ApiResponse({ status: 200, type: InventoryBranchListResponseDto })
  async findByVariant(
    @Param('variantId') variantId: string,
  ): Promise<InventoryBranchListResponse> {
    return this.service.findByVariant(variantId);
  }

  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an inventory record by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, type: InventoryBranchDetailResponseDto })
  async findOne(
    @Param('id') id: string,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.findOne(id);
  }

  /**
   * Reserve stock (for customer checkout)
   * POST /inventory-branch/reserve
   */
  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reserve stock',
    description:
      'Moves units from available → reserved. Used when a customer starts checkout. Transactional with row locking to prevent race conditions.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiBody({ type: ReserveStockDto })
  @ApiResponse({ status: 200, type: InventoryBranchDetailResponseDto })
  async reserve(
    @Body() dto: ReserveStockDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.reserve(dto);
  }

  /**
   * Release reservation (customer cancels / checkout timeout)
   * POST /inventory-branch/release-reservation
   */
  @Post('release-reservation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Release reserved stock back to available',
    description:
      'Moves units from reserved → available. Used when customer cancels or checkout times out.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiBody({ type: ReserveStockDto })
  @ApiResponse({ status: 200, type: InventoryBranchDetailResponseDto })
  async releaseReservation(
    @Body() dto: ReserveStockDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.releaseReservation(dto);
  }

  /**
   * Commit reservation (payment succeeded, item is sold)
   * POST /inventory-branch/commit-reservation
   */
  @Post('commit-reservation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Commit reservation (sell the item)',
    description:
      'Removes units from reserved permanently (sale is finalized). Decreases global variant stock to match.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager', 'cashier')
  @ApiBody({ type: ReserveStockDto })
  @ApiResponse({ status: 200, type: InventoryBranchDetailResponseDto })
  async commitReservation(
    @Body() dto: ReserveStockDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.commitReservation(dto);
  }

  /**
   * Transfer stock between branches
   * POST /inventory-branch/transfer
   */
  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer stock from one branch to another',
    description:
      'Move units between branches (e.g., restocking). Global variant stock stays the same — just redistributes physical location.',
  })
  @ApiBody({ type: TransferStockDto })
  @ApiResponse({
    status: 200,
    description: 'Source and destination records after transfer',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  async transfer(@Body() dto: TransferStockDto): Promise<{
    from: InventoryBranchResponse;
    to: InventoryBranchResponse;
  }> {
    return this.service.transfer(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update inventory quantities directly (admin use)',
    description:
      'Direct update of available/reserved/damaged quantities. For normal sales flow use reserve → commit instead. For inter-branch moves use /transfer.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateInventoryBranchDto })
  @ApiResponse({ status: 200, type: InventoryBranchDetailResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInventoryBranchDto,
  ): Promise<InventoryBranchDetailResponse> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an inventory record',
    description:
      'Removes the stock record. Global variant stock is recomputed.',
  })
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin', 'manager')
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 204 })
  async delete(@Param('id') id: string): Promise<void> {
    return this.service.delete(id);
  }
}
