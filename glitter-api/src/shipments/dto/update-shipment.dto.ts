import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateShipmentDto } from './create-shipment.dto';

/** Update everything except the order link. */
export class UpdateShipmentDto extends PartialType(
  OmitType(CreateShipmentDto, ['orderId'] as const),
) {}
