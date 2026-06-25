import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import type { ShipmentStatus } from '../entities/shipment.entity';

const STATUSES: ShipmentStatus[] = [
  'pending',
  'processing',
  'shipped',
  'in_transit',
  'delivered',
  'returned',
  'cancelled',
];

export class CreateShipmentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  carrierName?: string;

  @ApiPropertyOptional({ enum: STATUSES })
  @IsOptional()
  @IsEnum(STATUSES)
  status?: ShipmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  shippedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  estimatedDeliveryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  actualDeliveryDate?: string;
}
