import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ValidateVoucherDto {
  @ApiPropertyOptional({ description: 'Code to validate (omit for best auto promo)' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Current cart subtotal' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  subtotal!: number;

  @ApiPropertyOptional({ description: 'Selected delivery fee (for delivery promos)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingFee?: number;
}
