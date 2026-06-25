import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { OrdersService } from './orders.service';
import {
  OrderDetailResponse,
  OrderListResponse,
  OrderStatsResponse,
} from './types/order-response.type';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(RolesGuard)
@Roles('admin', 'super_admin', 'manager', 'cashier')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an order (in-store sale or online order)',
    description:
      'In-store orders are completed and sell stock immediately; online orders are created pending and reserve stock.',
  })
  async create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') currentUserId: string,
  ): Promise<OrderDetailResponse> {
    return this.service.create(dto, currentUserId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List orders (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('source') source?: string,
    @Query('status') status?: string,
    @Query('branchId') branchId?: string,
    @Query('search') search?: string,
  ): Promise<OrderListResponse> {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      source,
      status,
      branchId,
      search,
    });
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Order summary stats (optionally per branch)' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getStats(
    @Query('branchId') branchId?: string,
  ): Promise<OrderStatsResponse> {
    return this.service.getStats(branchId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single order with items and payments' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string): Promise<OrderDetailResponse> {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an order status',
    description:
      'Applies the matching stock movement (reserve/commit/release/return) automatically.',
  })
  @ApiParam({ name: 'id', type: String })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDetailResponse> {
    return this.service.updateStatus(id, dto.status);
  }

  @Patch(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an order paid / unpaid / partial / refunded' })
  @ApiParam({ name: 'id', type: String })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<OrderDetailResponse> {
    return this.service.updatePaymentStatus(id, dto.paymentStatus);
  }
}
