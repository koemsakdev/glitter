import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OrdersService } from '../orders/orders.service';
import { AbaPaywayService } from './aba-payway.service';
import { PaymentConfigService } from './payment-config.service';
import { AbaWebhookDto, CreateKhqrDto } from './dto/create-khqr.dto';

/**
 * Storefront-facing KHQR payment endpoints. Public because guests can pay.
 * Confirmation always re-verifies the status with ABA (check-transaction) —
 * we never trust the client or an unverified webhook body.
 */
@ApiTags('Payments — ABA KHQR')
@Controller('payments/aba')
export class PaymentsAbaController {
  constructor(
    private readonly aba: AbaPaywayService,
    private readonly orders: OrdersService,
    private readonly config: PaymentConfigService,
  ) {}

  @Public()
  @Get('enabled')
  @ApiOperation({ summary: 'Is KHQR auto-payment available?' })
  async enabled(): Promise<{ enabled: boolean }> {
    return { enabled: await this.aba.isEnabled() };
  }

  @Public()
  @Post('khqr')
  @ApiOperation({ summary: 'Generate a dynamic KHQR for an order' })
  async khqr(@Body() dto: CreateKhqrDto) {
    const payable = await this.orders.getKhqrPayable(dto.orderId);
    const qr = await this.aba.generateKhqr({
      tranId: payable.tranId,
      amount: payable.amount,
      currency: payable.currency,
      firstName: payable.firstName,
      phone: payable.phone,
    });
    return { data: qr };
  }

  @Public()
  @Post('checkout')
  @ApiOperation({
    summary: 'Get signed form fields for the ABA checkout popup',
  })
  async checkout(@Body() dto: CreateKhqrDto) {
    const payable = await this.orders.getKhqrPayable(dto.orderId);
    const result = await this.aba.generateCheckoutParams({
      tranId: payable.tranId,
      amount: payable.amount,
      currency: payable.currency,
      firstName: payable.firstName,
      phone: payable.phone,
    });
    return { data: result };
  }

  @Public()
  @Get('status/:tranId')
  @ApiOperation({ summary: 'Poll a KHQR transaction status' })
  async status(@Param('tranId') tranId: string): Promise<{
    status: string;
    paid: boolean;
    detail?: {
      tranId: string;
      apv: string;
      amount: string;
      currency: string;
      date: string;
      payer: string;
    };
  }> {
    const info = await this.aba.checkTransactionDetail(tranId);
    if (info.status === 'APPROVED') {
      const { paid } = await this.orders.confirmAbaPayment(tranId);
      return {
        status: info.status,
        paid,
        detail: {
          tranId,
          apv: info.apv,
          amount: info.amount,
          currency: info.currency,
          date: info.date,
          payer: info.payer,
        },
      };
    }
    return { status: info.status, paid: false };
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'PayWay pushback (payment result)' })
  async webhook(@Body() body: AbaWebhookDto): Promise<{ received: boolean }> {
    const tranId =
      body.tran_id ||
      body.return_params ||
      body.merchant_ref ||
      body.transaction_id ||
      '';
    if (tranId) {
      try {
        // Never trust the pushback body — verify with ABA before crediting.
        const status = await this.aba.checkTransaction(tranId);
        if (status === 'APPROVED') {
          await this.orders.confirmAbaPayment(tranId);
        }
      } catch {
        // Swallow — PayWay retries; polling is the safety net.
      }
    }
    return { received: true };
  }
}
