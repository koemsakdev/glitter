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
import type { OrderSource } from '../entities/order.entity';
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

  @ApiProperty({ description: 'Branch the order sells/fulfils from' })
  @IsUUID()
  branchId!: string;

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
