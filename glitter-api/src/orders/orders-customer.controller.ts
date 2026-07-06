import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateOnlineOrderDto } from './dto/create-online-order.dto';
import { OrdersService } from './orders.service';
import {
  OrderDetailResponse,
  OrderListResponse,
} from './types/order-response.type';

/**
 * Logged-in customer order endpoints. Not @Public — the global JwtAuthGuard
 * requires a valid token, and the customer id comes from that token (so it
 * can't be spoofed in the body).
 */
@ApiTags('Orders (customer)')
@ApiBearerAuth()
@Controller('account/orders')
export class OrdersCustomerController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Current customer's order history" })
  async myOrders(
    @CurrentUser('id') userId: string,
  ): Promise<OrderListResponse> {
    return this.service.findByCustomer(userId);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'View one of my orders' })
  async myOrder(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ): Promise<OrderDetailResponse> {
    return this.service.findOneForCustomer(id, userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place an order as a logged-in customer' })
  async place(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOnlineOrderDto,
  ): Promise<OrderDetailResponse> {
    return this.service.create(
      {
        source: 'online',
        customerId: userId,
        branchId: dto.branchId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        note: dto.note,
        items: dto.items,
        deliveryRegion: dto.deliveryRegion,
        deliveryMethod: dto.deliveryMethod,
        deliveryAddress: dto.deliveryAddress,
        deliveryLat: dto.deliveryLat,
        deliveryLng: dto.deliveryLng,
        paymentMethod: dto.paymentMethod,
        paymentProofUrl: dto.paymentProofUrl,
        voucherCode: dto.voucherCode,
      },
      '',
    );
  }
}
