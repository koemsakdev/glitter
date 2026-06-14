import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: [
      'pending',
      'paid',
      'processing',
      'shipped',
      'completed',
      'cancelled',
      'refunded',
    ],
  })
  @IsEnum([
    'pending',
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled',
    'refunded',
  ])
  status!: OrderStatus;
}
