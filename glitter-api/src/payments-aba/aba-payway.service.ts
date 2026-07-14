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
  /** Minutes the QR is valid for. */
  lifetimeMinutes: number;
  /** ISO timestamp when the QR expires (the storefront stops polling then). */
  expiresAt: string;
}

/** How long a checkout KHQR stays valid before the customer must re-generate.
 *  Kept short so an abandoned popup can't poll ABA forever. */
export const KHQR_LIFETIME_MIN = 5;

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
  apv?: string;
  total_amount?: string | number;
  original_amount?: string | number;
  payment_amount?: string | number;
  payment_currency?: string;
  original_currency?: string;
  transaction_date?: string;
  payment_date?: string;
  payer_account_name?: string;
  bank_ref?: string;
}

/** Verified transaction details shown on the payment-success screen. */
export interface AbaTransactionInfo {
  status: AbaPaymentStatus;
  apv: string;
  amount: string;
  currency: string;
  date: string;
  payer: string;
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
    return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
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
   * Call ABA's Purchase endpoint with `abapay_khqr_deeplink` to get a
   * `checkout_qr_url` that can be shown in an iframe on the storefront.
   *
   * Hash field order from official ABA Purchase API docs (24 fields):
   * req_time + merchant_id + tran_id + amount + items + shipping +
   * firstname + lastname + email + phone + type + payment_option +
   * return_url + cancel_url + continue_success_url + return_deeplink +
   * currency + custom_fields + return_params + payout + lifetime +
   * additional_params + google_pay_token + skip_success_page
   *
   * Content-Type: multipart/form-data (per official docs)
   */
  /**
   * Build the SIGNED form fields for ABA's hosted checkout popup (checkout2-0.js).
   * The storefront renders these as a hidden <form id="aba_merchant_request"
   * target="aba_webservice"> that POSTs to `actionUrl`, then calls
   * `AbaPayway.checkout()` to open ABA's branded KHQR overlay. We do NOT call
   * the purchase API server-to-server — the plugin drives the iframe itself and
   * ABA notifies us of the result via the pushback webhook / status polling.
   */
  async generateCheckoutParams(params: {
    tranId: string;
    amount: string;
    currency?: string;
    firstName?: string;
    phone?: string;
  }): Promise<{
    actionUrl: string;
    fields: Record<string, string>;
  }> {
    const creds = await this.requireCreds();
    const reqTime = this.reqTime();
    const currency = params.currency ?? 'USD';
    // MUST be empty so ABA returns its HTML checkout interface (the modal with
    // KHQR / cards / Alipay / WeChat tabs). A specific value makes the purchase
    // endpoint return raw JSON (the QR-API style) instead of the checkout page.
    const paymentOption = '';
    const type = 'purchase';
    const returnUrl = creds.webhookUrl
      ? Buffer.from(creds.webhookUrl).toString('base64')
      : '';
    const firstname = params.firstName ?? '';
    const phone = params.phone ?? '';
    const returnParams = params.tranId;

    // Exact hash field order from official ABA Purchase API PHP sample (24 fields).
    // ABA recomputes this over the SAME order using the values it receives, so
    // every field we sign with a value must be POSTed with that same value.
    const hash = this.hash(
      [
        reqTime, // req_time
        creds.merchantId, // merchant_id
        params.tranId, // tran_id
        params.amount, // amount
        '', // items
        '', // shipping
        firstname, // firstname
        '', // lastname
        '', // email
        phone, // phone
        type, // type
        paymentOption, // payment_option
        returnUrl, // return_url
        '', // cancel_url
        '', // continue_success_url
        '', // return_deeplink
        currency, // currency
        '', // custom_fields
        returnParams, // return_params
        '', // payout
        '', // lifetime
        '', // additional_params
        '', // google_pay_token
        '', // skip_success_page
      ],
      creds.apiKey,
    );

    const fields: Record<string, string> = {
      req_time: reqTime,
      merchant_id: creds.merchantId,
      tran_id: params.tranId,
      amount: params.amount,
      currency,
      type,
      payment_option: paymentOption,
      return_params: returnParams,
      hash,
    };
    if (firstname) fields.firstname = firstname;
    if (phone) fields.phone = phone;
    if (returnUrl) fields.return_url = returnUrl;

    return {
      actionUrl: `${creds.baseUrl}/api/payment-gateway/v1/payments/purchase`,
      fields,
    };
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
    const lifetimeMinutes = params.lifetimeMinutes ?? KHQR_LIFETIME_MIN;
    const lifetime = String(lifetimeMinutes);
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
    if ((code !== '0' && code !== '00') || !json.qrString) {
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
      lifetimeMinutes,
      expiresAt: new Date(Date.now() + lifetimeMinutes * 60_000).toISOString(),
    };
  }

  /** Poll the authoritative payment status for a transaction. */
  async checkTransaction(tranId: string): Promise<AbaPaymentStatus> {
    return (await this.checkTransactionDetail(tranId)).status;
  }

  /** Like checkTransaction, but also returns the verified receipt details
   *  (approval code, amount, date, payer) for the success screen. */
  async checkTransactionDetail(tranId: string): Promise<AbaTransactionInfo> {
    const creds = await this.requireCreds();
    const reqTime = this.reqTime();
    const hash = this.hash([reqTime, creds.merchantId, tranId], creds.apiKey);

    const json = await this.post<CheckTxnResponse>(
      `${creds.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
      {
        req_time: reqTime,
        merchant_id: creds.merchantId,
        tran_id: tranId,
        hash,
      },
    );

    const raw = (json.payment_status ?? '').toUpperCase();
    const status: AbaPaymentStatus =
      raw === 'APPROVED' ||
      raw === 'PENDING' ||
      raw === 'DECLINED' ||
      raw === 'REFUNDED' ||
      raw === 'CANCELLED'
        ? raw
        : 'UNKNOWN';

    const amount =
      json.total_amount ?? json.payment_amount ?? json.original_amount ?? '';
    return {
      status,
      apv: String(json.apv ?? ''),
      amount: amount === '' ? '' : String(amount),
      currency: String(json.payment_currency ?? json.original_currency ?? ''),
      date: String(json.transaction_date ?? json.payment_date ?? ''),
      payer: String(json.payer_account_name ?? ''),
    };
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
