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
  /** Merchant/account name (EMV field 59), shown on the KHQR card. */
  merchantName: string;
  /** Minutes the QR is valid for. */
  lifetimeMinutes: number;
  /** ISO timestamp when the QR expires (the storefront stops polling then). */
  expiresAt: string;
}

/**
 * PayWay status codes we've met, in plain words. Anything else falls back to
 * ABA's own message. (ABA also returns a trace_id we log for their support.)
 */
const ABA_REASONS: Record<string, string> = {
  '1': 'Invalid hash — the API key is wrong or the signed fields do not match',
  '2': 'Invalid transaction ID',
  '3': 'Invalid amount',
  '4': 'Duplicate transaction ID — this tran_id was already used',
  '5': 'Invalid currency',
  '6': 'Transaction not found at ABA',
  '32': 'This PayWay service is not enabled for the merchant — ask ABA to enable the KHQR (generate-qr) API for this merchant ID',
};

/** A PayWay request ABA refused — carries ABA's code for the logs/clients. */
export class AbaGatewayError extends ServiceUnavailableException {
  constructor(
    readonly abaCode: string,
    readonly reason: string,
    readonly traceId?: string,
  ) {
    super({
      statusCode: 503,
      code: `ABA_${abaCode || 'ERROR'}`,
      message: reason,
      abaCode,
      traceId,
    });
  }
}

/** How long a checkout KHQR stays valid before the customer must re-generate.
 *  Kept short so an abandoned popup can't poll ABA forever. */
export const KHQR_LIFETIME_MIN = 5;

/** Read an EMVCo/KHQR TLV field (2-digit tag + 2-digit length + value) from the
 *  QR payload. Field 59 = merchant name, 54 = amount, 53 = currency. */
function readEmvField(qr: string, tag: string): string {
  let i = 0;
  while (i + 4 <= qr.length) {
    const t = qr.slice(i, i + 2);
    const len = Number(qr.slice(i + 2, i + 4));
    if (!Number.isFinite(len) || len <= 0) break;
    const value = qr.slice(i + 4, i + 4 + len);
    if (t === tag) return value.trim();
    i += 4 + len;
  }
  return '';
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

/** The transaction fields — ABA nests these under `data` on check-transaction-2,
 *  but we also read them at the top level as a defensive fallback. */
interface CheckTxnData {
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

interface CheckTxnResponse extends CheckTxnData {
  status?: { code?: string | number; message?: string; tran_id?: string };
  /** ABA wraps the payment fields here (e.g. { data: { payment_status } }). */
  data?: CheckTxnData;
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
      'aba.generate_qr',
      `${creds.baseUrl}/api/payment-gateway/v1/payments/generate-qr`,
      body,
      {
        tranId: params.tranId,
        amount: params.amount,
        currency,
        sandbox: creds.sandbox,
        merchantId: creds.merchantId,
      },
    );

    const code = String(json.status?.code ?? '');
    if ((code !== '0' && code !== '00') || !json.qrString) {
      throw this.rejected('aba.generate_qr', code, json.status?.message, json, {
        tranId: params.tranId,
        merchantId: creds.merchantId,
        sandbox: creds.sandbox,
      });
    }

    return {
      tranId: params.tranId,
      qrString: json.qrString,
      qrImage: json.qrImage ?? '',
      deeplink: json.abapay_deeplink ?? '',
      amount: params.amount,
      currency,
      merchantName: readEmvField(json.qrString, '59'),
      lifetimeMinutes,
      expiresAt: new Date(Date.now() + lifetimeMinutes * 60_000).toISOString(),
    };
  }

  /**
   * Admin "Test connection": checks the credentials and which PayWay services
   * this merchant can use, each with the exact reason when it can't.
   */
  async diagnose(): Promise<{
    environment: 'sandbox' | 'production';
    merchantId: string;
    checks: {
      id: 'credentials' | 'khqr_api' | 'hosted_checkout';
      ok: boolean;
      detail: string;
    }[];
  }> {
    const creds = await this.config.getCredentials();
    const checks: {
      id: 'credentials' | 'khqr_api' | 'hosted_checkout';
      ok: boolean;
      detail: string;
    }[] = [];
    const environment = creds.sandbox ? 'sandbox' : 'production';
    if (!creds.enabled || !creds.merchantId || !creds.apiKey) {
      checks.push({
        id: 'credentials',
        ok: false,
        detail: !creds.enabled
          ? 'ABA PayWay is switched off in payment settings'
          : 'Merchant ID or API key is missing',
      });
      return { environment, merchantId: creds.merchantId, checks };
    }
    const tranId = `CHK${Date.now().toString().slice(-12)}`;

    // 1. Credentials: ABA only answers "not found" if the hash checks out.
    try {
      const reqTime = this.reqTime();
      const res = await this.post<{
        status?: { code?: string | number; message?: string };
      }>(
        'aba.diagnose',
        `${creds.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
        {
          req_time: reqTime,
          merchant_id: creds.merchantId,
          tran_id: tranId,
          hash: this.hash([reqTime, creds.merchantId, tranId], creds.apiKey),
        },
        { tranId, merchantId: creds.merchantId, sandbox: creds.sandbox },
      );
      const code = String(res.status?.code ?? '');
      const ok = code === '6' || code === '0' || code === '00';
      checks.push({
        id: 'credentials',
        ok,
        detail: ok
          ? 'Merchant ID and API key accepted by ABA'
          : (ABA_REASONS[code] ?? res.status?.message ?? `ABA code ${code}`),
      });
    } catch (e) {
      checks.push({
        id: 'credentials',
        ok: false,
        detail: (e as Error).message,
      });
    }

    // 2. KHQR API (used by the "ABA KHQR" payment option).
    try {
      await this.generateKhqr({ tranId, amount: '0.01' });
      checks.push({
        id: 'khqr_api',
        ok: true,
        detail: 'KHQR (generate-qr) API is enabled',
      });
    } catch (e) {
      checks.push({
        id: 'khqr_api',
        ok: false,
        detail: e instanceof AbaGatewayError ? e.reason : (e as Error).message,
      });
    }

    // 3. Hosted checkout (used by "ABA KHQR E-Commerce").
    try {
      const { actionUrl, fields } = await this.generateCheckoutParams({
        tranId: `${tranId}H`,
        amount: '0.01',
      });
      const form = new FormData();
      for (const [k, v] of Object.entries(fields)) form.append(k, v);
      const res = await fetch(actionUrl, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(15_000),
      });
      const body = await res.text();
      const isPage = /<html/i.test(body) && /checkout/i.test(body);
      let detail = 'Hosted checkout page opens';
      if (!isPage) {
        try {
          const j = JSON.parse(body) as {
            status?: { code?: string | number; message?: string };
          };
          const code = String(j.status?.code ?? '');
          detail =
            ABA_REASONS[code] ?? j.status?.message ?? `HTTP ${res.status}`;
        } catch {
          detail = `Unexpected response (HTTP ${res.status})`;
        }
      }
      checks.push({ id: 'hosted_checkout', ok: isPage, detail });
    } catch (e) {
      checks.push({
        id: 'hosted_checkout',
        ok: false,
        detail: (e as Error).message,
      });
    }

    this.logger.log({
      message: `ABA connection test: ${checks.map((c) => `${c.id}=${c.ok ? 'ok' : 'fail'}`).join(', ')}`,
      event: {
        kind: 'event',
        category: ['payment'],
        action: 'aba.diagnose',
        outcome: checks.every((c) => c.ok) ? 'success' : 'failure',
      },
      aba: { merchant_id: creds.merchantId, sandbox: creds.sandbox, checks },
    });
    return { environment, merchantId: creds.merchantId, checks };
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
      'aba.check_transaction',
      `${creds.baseUrl}/api/payment-gateway/v1/payments/check-transaction-2`,
      {
        req_time: reqTime,
        merchant_id: creds.merchantId,
        tran_id: tranId,
        hash,
      },
      { tranId, sandbox: creds.sandbox, merchantId: creds.merchantId },
    );

    // ABA nests the transaction fields under `data` — read there first, then
    // fall back to the top level for resilience against API shape changes.
    const d = json.data ?? json;
    const raw = (d.payment_status ?? '').toUpperCase();
    const status: AbaPaymentStatus =
      raw === 'APPROVED' ||
      raw === 'PENDING' ||
      raw === 'DECLINED' ||
      raw === 'REFUNDED' ||
      raw === 'CANCELLED'
        ? raw
        : 'UNKNOWN';

    const amount =
      d.payment_amount || d.total_amount || d.original_amount || '';
    return {
      status,
      apv: String(d.apv ?? ''),
      amount: amount === '' ? '' : String(amount),
      currency: String(d.payment_currency ?? d.original_currency ?? ''),
      date: String(d.transaction_date ?? d.payment_date ?? ''),
      payer: String(d.payer_account_name ?? ''),
    };
  }

  /**
   * Log + build the error for a request ABA answered but refused.
   * The reason is ABA's code translated to plain words (see ABA_REASONS).
   */
  private rejected(
    action: string,
    code: string,
    abaMessage: string | undefined,
    json: unknown,
    ctx: Record<string, unknown>,
  ): AbaGatewayError {
    const traceId = (json as { status?: { trace_id?: string } })?.status
      ?.trace_id;
    const reason =
      ABA_REASONS[code] ?? abaMessage ?? 'ABA PayWay refused the request';
    this.logger.warn({
      message: `ABA ${action.replace('aba.', '')} refused: ${reason}`,
      event: {
        kind: 'event',
        category: ['payment'],
        action,
        outcome: 'failure',
        reason,
      },
      aba: {
        code,
        message: abaMessage,
        trace_id: traceId,
        tran_id: ctx.tranId,
        merchant_id: ctx.merchantId,
        sandbox: ctx.sandbox,
      },
    });
    return new AbaGatewayError(code, reason, traceId);
  }

  /** POST JSON to PayWay; logs every call (ECS) with timing and outcome. */
  private async post<T>(
    action: string,
    url: string,
    body: unknown,
    ctx: Record<string, unknown> = {},
  ): Promise<T> {
    const started = process.hrtime.bigint();
    const duration = () => Number(process.hrtime.bigint() - started);
    const aba = {
      tran_id: ctx.tranId,
      merchant_id: ctx.merchantId,
      sandbox: ctx.sandbox,
    };
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      const reason =
        (err as Error)?.name === 'TimeoutError'
          ? 'ABA PayWay did not answer within 15 seconds'
          : 'Could not reach ABA PayWay (network/DNS error)';
      this.logger.error({
        message: `ABA ${action.replace('aba.', '')} failed: ${reason}`,
        event: {
          kind: 'event',
          category: ['payment'],
          action,
          outcome: 'failure',
          reason,
          duration: duration(),
        },
        url: { full: url },
        aba,
        error: err as unknown,
      });
      throw new AbaGatewayError('UNREACHABLE', reason);
    }
    const text = await res.text();
    let json: T;
    try {
      json = JSON.parse(text) as T;
    } catch {
      const reason = `ABA PayWay returned a non-JSON response (HTTP ${res.status})`;
      this.logger.error({
        message: `ABA ${action.replace('aba.', '')} failed: ${reason}`,
        event: {
          kind: 'event',
          category: ['payment'],
          action,
          outcome: 'failure',
          reason,
          duration: duration(),
        },
        http: {
          response: {
            status_code: res.status,
            body: { content: text.slice(0, 500) },
          },
        },
        aba,
      });
      throw new AbaGatewayError('BAD_RESPONSE', reason);
    }
    const status = (
      json as { status?: { code?: string | number; message?: string } }
    ).status;
    const code = String(status?.code ?? '');
    const ok = code === '0' || code === '00';
    this.logger.debug({
      message:
        `ABA ${action.replace('aba.', '')} → ${code || res.status} ${status?.message ?? ''}`.trim(),
      event: {
        kind: 'event',
        category: ['payment'],
        action,
        outcome: ok ? 'success' : 'unknown',
        duration: duration(),
      },
      http: { response: { status_code: res.status } },
      aba: { ...aba, code, message: status?.message },
    });
    return json;
  }
}
