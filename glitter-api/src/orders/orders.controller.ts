import {
  Body,
  ForbiddenException,
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
import {
  assertBranchAccess,
  resolveBranchScope,
} from '../common/helpers/branch-scope.helper';
import { UserEntity } from '../users/entities/user.entity';
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
@Roles('admin', 'manager', 'cashier')
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
    @CurrentUser() user: UserEntity,
  ): Promise<OrderDetailResponse> {
    // Managers/cashiers always sell from their own branch.
    if (user.role !== 'admin') {
      dto.branchId = resolveBranchScope(user, dto.branchId);
    }
    return this.service.create(dto, user.id);
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
    @Query('paymentStatus') paymentStatus?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @CurrentUser() user?: UserEntity,
  ): Promise<OrderListResponse> {
    return this.service.findAll({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      source,
      status,
      branchId: resolveBranchScope(user!, branchId),
      search,
      paymentStatus,
      from,
      to,
      sortBy,
      sortOrder: sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
    });
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Order summary stats (optionally per branch)' })
  @ApiQuery({ name: 'branchId', required: false, type: String })
  async getStats(
    @CurrentUser() user: UserEntity,
    @Query('branchId') branchId?: string,
  ): Promise<OrderStatsResponse> {
    return this.service.getStats(resolveBranchScope(user, branchId));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single order with items and payments' })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UserEntity,
  ): Promise<OrderDetailResponse> {
    const order = await this.service.findOne(id);
    assertBranchAccess(user, order.data.branchId);
    return order;
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
    @CurrentUser() user: UserEntity,
  ): Promise<OrderDetailResponse> {
    assertBranchAccess(user, await this.service.getBranchId(id));
    // Cancelling / refunding gives money and stock back — manager or admin.
    if (
      user.role === 'cashier' &&
      (dto.status === 'cancelled' || dto.status === 'refunded')
    ) {
      throw new ForbiddenException(
        'Only a manager or admin can cancel or refund an order',
      );
    }
    return this.service.updateStatus(id, dto.status);
  }

  @Patch(':id/payment-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an order paid / unpaid / partial / refunded' })
  @ApiParam({ name: 'id', type: String })
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() user: UserEntity,
  ): Promise<OrderDetailResponse> {
    assertBranchAccess(user, await this.service.getBranchId(id));
    if (user.role === 'cashier' && dto.paymentStatus === 'refunded') {
      throw new ForbiddenException(
        'Only a manager or admin can mark a payment refunded',
      );
    }
    return this.service.updatePaymentStatus(id, dto.paymentStatus);
  }
}
