import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { OrderPaymentStatus } from '../entities/order.entity';

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: ['unpaid', 'partial', 'paid', 'refunded'] })
  @IsEnum(['unpaid', 'partial', 'paid', 'refunded'])
  paymentStatus!: OrderPaymentStatus;
}
