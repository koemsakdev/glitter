import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type {
  DeliveryMethod,
  DeliveryRegion,
  OrderPaymentMethod,
  OrderSource,
} from '../entities/order.entity';
import type { PaymentMethod } from '../entities/payment.entity';

export class OrderItemInputDto {
  @ApiProperty({ description: 'Product variant UUID' })
  @IsUUID()
  productVariantId!: string;

  @ApiProperty({ description: 'Quantity to sell', example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PaymentInputDto {
  @ApiProperty({ enum: ['cash', 'khqr', 'aba'] })
  @IsEnum(['cash', 'khqr', 'aba'])
  method!: PaymentMethod;

  @ApiProperty({ description: 'Amount paid', example: 25.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiPropertyOptional({ description: 'External transaction reference' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reference?: string;
}

export class CreateOrderDto {
  @ApiProperty({ enum: ['in_store', 'online'] })
  @IsEnum(['in_store', 'online'])
  source!: OrderSource;

  @ApiPropertyOptional({
    description:
      'Branch the order sells/fulfils from. Required in-store; for online it is only needed for store pickup (otherwise the server picks the primary branch).',
  })
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Customer user UUID (omit for walk-in)' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Customer name for the receipt' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @ApiPropertyOptional({ description: 'Customer phone for the receipt' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  customerPhone?: string;

  @ApiPropertyOptional({ description: 'Order note' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ description: 'Voucher / promo code to apply' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiPropertyOptional({
    description: 'Manual discount on the order total',
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiPropertyOptional({ description: 'Shipping / delivery fee', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Tax amount on the order', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  // ----- Storefront delivery / payment (online only) -----

  @ApiPropertyOptional({
    description: 'Shipping region id (admin-configurable; default ids: phnom_penh, province)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  deliveryRegion?: DeliveryRegion;

  @ApiPropertyOptional({ description: "Snapshot of the region's display name" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryRegionName?: string;

  @ApiPropertyOptional({
    description: 'Delivery method id (admin-configurable)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional({ description: "Snapshot of the method's display name" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryMethodName?: string;

  @ApiPropertyOptional({ description: 'Written delivery address' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Delivery location latitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryLat?: number;

  @ApiPropertyOptional({ description: 'Delivery location longitude' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  deliveryLng?: number;

  @ApiPropertyOptional({
    description: 'Payment option id (admin-configurable)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: OrderPaymentMethod;

  @ApiPropertyOptional({
    description: "Snapshot of the payment option's display name",
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentMethodName?: string;

  @ApiPropertyOptional({ description: 'Uploaded KHQR payment proof URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  paymentProofUrl?: string;

  @ApiProperty({ type: [OrderItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @ApiPropertyOptional({
    type: [PaymentInputDto],
    description:
      'Payments taken now. For in-store, defaults to a single cash payment of the full total if omitted.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentInputDto)
  payments?: PaymentInputDto[];
}
