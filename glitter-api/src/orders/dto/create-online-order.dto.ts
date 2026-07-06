import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateOrderDto } from './create-order.dto';

/**
 * Storefront checkout (guest or logged-in). The server forces `source: 'online'`,
 * computes prices + the delivery fee from the store config, and never trusts a
 * client-supplied shipping cost or payment status. Inherits the delivery /
 * payment fields from CreateOrderDto.
 */
export class CreateOnlineOrderDto extends OmitType(CreateOrderDto, [
  'source',
  'customerId',
  'discountTotal',
  'shippingCost',
  'taxAmount',
  'payments',
] as const) {
  @ApiPropertyOptional({
    description: "Logged-in customer's saved address to deliver to",
  })
  @IsOptional()
  @IsUUID()
  addressId?: string;
}
