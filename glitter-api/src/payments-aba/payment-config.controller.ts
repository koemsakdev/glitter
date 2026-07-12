import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentConfigService } from './payment-config.service';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

/**
 * Admin-only ABA PayWay configuration. There is deliberately NO public route
 * here — the storefront learns that KHQR is available from the (public)
 * delivery payment options, never from these secret credentials.
 */
@ApiTags('Payment Config')
@ApiBearerAuth()
@Controller('payment-config')
@UseGuards(RolesGuard)
@Roles('admin', 'super_admin')
export class PaymentConfigController {
  constructor(private readonly service: PaymentConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get ABA PayWay config (admin-only, incl. secrets)' })
  get() {
    return this.service.getAdminView();
  }

  @Put()
  @ApiOperation({ summary: 'Update ABA PayWay config' })
  update(@Body() dto: UpdatePaymentConfigDto) {
    return this.service.update(dto);
  }
}
