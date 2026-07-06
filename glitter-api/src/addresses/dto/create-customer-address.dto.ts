import { OmitType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address.dto';

/** A logged-in customer creating their own address — userId comes from the token. */
export class CreateCustomerAddressDto extends OmitType(CreateAddressDto, [
  'userId',
] as const) {}
