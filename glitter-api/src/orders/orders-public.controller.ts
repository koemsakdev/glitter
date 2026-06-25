import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { OrdersService } from './orders.service';
import { OrderDetailResponse } from './types/order-response.type';

/**
 * Public storefront checkout. No auth — creates a pending online order that
 * reserves stock. Kept separate from the admin OrdersController so it isn't
 * behind the roles guard.
 */
@ApiTags('Orders (public)')
@Controller('orders')
export class OrdersPublicController {
  constructor(private readonly service: OrdersService) {}

  @Public()
  @Post('online')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Place an online order (guest checkout)',
    description:
      'Creates a pending online order and reserves stock. Prices are computed server-side.',
  })
  @ApiResponse({ status: 201, description: 'Order placed' })
  async createOnline(
    @Body() dto: CreateOnlineOrderDto,
  ): Promise<OrderDetailResponse> {
    return this.service.create(
      {
        source: 'online',
        branchId: dto.branchId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        shippingCost: dto.shippingCost,
        note: dto.note,
        items: dto.items,
      },
      '',
    );
  }
}
