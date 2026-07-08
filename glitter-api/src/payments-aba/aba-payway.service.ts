import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import {
  PaymentConfigService,
  type PaymentCredentials,
} from './payment-config.service';

export interface KhqrResult {
  tranId: string;
  qrString: string;
  qrImage: string; // base64 PNG (data payload only)
  deeplink: string;
  amount: string;
  currency: string;
}

export type AbaPaymentStatus =
  | 'APPROVED'
  | 'PENDING'
  | 'DECLINED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'UNKNOWN';

interface GenerateQrResponse {
  status?: { code?: string | number; message?: string };
  qrString?: string;
  qrImage?: string;
  abapay_deeplink?: string;
}

interface CheckTxnResponse {
  status?: { code?: string | number; message?: string };
  payment_status?: string;
  payment_status_code?: string | number;
}

/**
 * Thin client for ABA PayWay's KHQR APIs. Reads credentials from
 * PaymentConfigService (DB, admin-managed) and signs every request with
 * Base64(HMAC-SHA512(concatenated-fields, apiKey)). Field order is fixed by
 * PayWay and must not change.
 */
@Injectable()
export class AbaPaywayService {
  private readonly logger = new Logger(AbaPaywayService.name);

  constructor(private readonly config: PaymentConfigService) {}

  /** UTC timestamp "YYYYMMDDHHmmss" required on every request. */
  private reqTime(): string {
    return new Date()
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14);
  }

  private hash(fields: string[], apiKey: string): string {
    return createHmac('sha512', apiKey)
      .update(fields.join(''))
      .digest('base64');
  }

  private async requireCreds(): Promise<PaymentCredentials> {
    const creds = await this.config.getCredentials();
    if (!creds.enabled) {
      throw new BadRequestException('ABA PayWay is not enabled');
    }
    if (!creds.merchantId || !creds.apiKey) {
      throw new BadRequestException('ABA PayWay is not fully configured');
    }
    return creds;
  }

  /** Whether KHQR auto-payment is switched on and configured. */
  async isEnabled(): Promise<boolean> {
    const creds = await this.config.getCredentials();
    return creds.enabled && !!creds.merchantId && !!creds.apiKey;
  }

  /**
   * Generate a dynamic KHQR for a transaction. `tranId` must be unique and
   * <= 20 chars (we derive it from the order number).
   */
  async generateKhqr(params: {
    tranId: string;
    amount: string; // e.g. "10.50"
    currency?: string; // USD | KHR
    lifetimeMinutes?: number;
    firstName?: string;
    phone?: string;
  }): Promise<KhqrResult> {
    const creds = await this.requireCreds();

    const reqTime = this.reqTime();
    const currency = params.currency ?? 'USD';
    const lifetime = String(params.lifetimeMinutes ?? 30);
    const template = 'template1_color';
    const paymentOption = 'abapay_khqr';
    const purchaseType = 'purchase';
    const callbackUrl = creds.webhookUrl
      ? Buffer.from(creds.webhookUrl).toString('base64')
      : '';
    const firstName = params.firstName ?? '';
    const phone = params.phone ?? '';
    const returnParams = params.tranId;

    // Fixed hash order for generate-qr (see PayWay QR API docs).
    const hash = this.hash(
      [
        reqTime,
        creds.merchantId,
        params.tranId,
        params.amount,
        '', // items
        firstName,
        '', // last_name
        '', // email
        phone,
        purchaseType,
        paymentOption,
        callbackUrl,
        '', // return_deeplink
        currency,
        '', // custom_fields
        returnParams,
        '', // payout
        lifetime,
        template,
      ],
      creds.apiKey,
    );

    const body = {
      req_time: reqTime,
      merchant_id: creds.merchantId,
      tran_id: params.tranId,
      amount: params.amount,
      first_name: firstName || undefined,
      phone: phone || undefined,
      purchase_type: purchaseType,
      payment_option: paymentOption,
      callback_url: callbackUrl || undefined,
      currency,
      return_params: returnParams,
      lifetime,
      qr_image_template: template,
      hash,
    };

    const json = await this.post<GenerateQrResponse>(
      `${creds.baseUrl}/api/payment-gateway/v1/payments/generate-qr`,
      body,
    );

    const code = String(json.status?.code ?? '');
    if (code !== '0' || !json.qrString) {
      this.logger.warn(
        `generate-qr failed: ${code} ${json.status?.message ?? ''}`,
      );
      throw new ServiceUnavailableException(
        json.status?.message || 'Could not generate KHQR',
      );
    }

    return {
      tranId: params.tranId,
      qrString: json.qrString,
      qrImage: json.qrImage ?? '',
      deeplink: json.abapay_deeplink ?? '',
      amount: params.amount,
      currency,
    };
  }

  /** Poll the authoritative payment status for a transaction. */
  async checkTransaction(tranId: string): Promise<AbaPaymentStatus> {
    const creds = await this.requireCreds();
    const reqTime = this.reqTime();
    const hash = this.hash(
      [reqTime, creds.merchantId, tranId],
      creds.apiKey,
    );

    const json = await this.post<CheckTxnResponse>(
      `${creds.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
      {
        req_time: reqTime,
        merchant_id: creds.merchantId,
        tran_id: tranId,
        hash,
      },
    );

    const status = (json.payment_status ?? '').toUpperCase();
    if (
      status === 'APPROVED' ||
      status === 'PENDING' ||
      status === 'DECLINED' ||
      status === 'REFUNDED' ||
      status === 'CANCELLED'
    ) {
      return status;
    }
    return 'UNKNOWN';
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(`ABA request failed: ${url}`, err as Error);
      throw new ServiceUnavailableException('Payment gateway unreachable');
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      this.logger.error(`ABA non-JSON response (${res.status}): ${text}`);
      throw new ServiceUnavailableException('Invalid payment gateway response');
    }
  }
}
