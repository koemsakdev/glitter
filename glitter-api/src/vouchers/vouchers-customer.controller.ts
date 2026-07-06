import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import {
  VouchersService,
  type PublicVoucher,
  type VoucherValidation,
} from './vouchers.service';

/**
 * Voucher endpoints scoped to the logged-in customer. Unlike the public
 * validate, these know who the user is, so customer-restricted promos (new
 * customers) are evaluated correctly.
 */
@ApiTags('Vouchers')
@ApiBearerAuth()
@Controller('account/vouchers')
export class VouchersCustomerController {
  constructor(private readonly service: VouchersService) {}

  @Get('mine')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Promos this customer is eligible for' })
  async mine(
    @CurrentUser('id') userId: string,
  ): Promise<{ data: PublicVoucher[] }> {
    return { data: await this.service.findEligible(userId) };
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a code as the logged-in customer' })
  async validate(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateVoucherDto,
  ): Promise<{ data: VoucherValidation }> {
    return {
      data: await this.service.validate(
        dto.subtotal,
        dto.code,
        dto.shippingFee,
        userId,
      ),
    };
  }
}
