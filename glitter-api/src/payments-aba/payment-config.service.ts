import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentConfigEntity } from './entities/payment-config.entity';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

/**
 * Admin-only view. Includes the secret values (API key + RSA private key) so
 * the admin can review/edit their own credentials in the dashboard — this route
 * is guarded to admin/super_admin roles and is NEVER exposed to the storefront.
 */
export interface PaymentConfigAdminView {
  enabled: boolean;
  sandbox: boolean;
  merchantId: string;
  webhookUrl: string;
  rsaPublicKey: string;
  apiKey: string;
  rsaPrivateKey: string;
  hasApiKey: boolean;
  hasRsaPrivateKey: boolean;
}

/** Full credentials — backend-only, never sent over HTTP. */
export interface PaymentCredentials {
  enabled: boolean;
  sandbox: boolean;
  merchantId: string;
  apiKey: string;
  rsaPrivateKey: string;
  webhookUrl: string;
  baseUrl: string;
}

const SANDBOX_BASE = 'https://checkout-sandbox.payway.com.kh';
const PRODUCTION_BASE = 'https://checkout.payway.com.kh';

@Injectable()
export class PaymentConfigService {
  constructor(
    @InjectRepository(PaymentConfigEntity)
    private readonly repo: Repository<PaymentConfigEntity>,
  ) {}

  /** The single config row, created empty on first access. */
  private async getOrCreate(): Promise<PaymentConfigEntity> {
    const existing = await this.repo.findOne({
      where: {},
      order: { createdAt: 'ASC' },
    });
    if (existing) return existing;
    return this.repo.save(this.repo.create({}));
  }

  private toAdminView(c: PaymentConfigEntity): PaymentConfigAdminView {
    return {
      enabled: c.enabled,
      sandbox: c.sandbox,
      merchantId: c.merchantId,
      webhookUrl: c.webhookUrl,
      rsaPublicKey: c.rsaPublicKey,
      apiKey: c.apiKey,
      rsaPrivateKey: c.rsaPrivateKey,
      hasApiKey: c.apiKey.trim().length > 0,
      hasRsaPrivateKey: c.rsaPrivateKey.trim().length > 0,
    };
  }

  async getAdminView(): Promise<PaymentConfigAdminView> {
    return this.toAdminView(await this.getOrCreate());
  }

  async update(dto: UpdatePaymentConfigDto): Promise<PaymentConfigAdminView> {
    const c = await this.getOrCreate();
    if (dto.enabled !== undefined) c.enabled = dto.enabled;
    if (dto.sandbox !== undefined) c.sandbox = dto.sandbox;
    if (dto.merchantId !== undefined) c.merchantId = dto.merchantId.trim();
    if (dto.webhookUrl !== undefined) c.webhookUrl = dto.webhookUrl.trim();
    if (dto.rsaPublicKey !== undefined) c.rsaPublicKey = dto.rsaPublicKey.trim();
    // Secrets: only overwrite when a non-empty value is supplied, so leaving
    // the field blank in the form keeps the stored key.
    if (dto.apiKey && dto.apiKey.trim()) c.apiKey = dto.apiKey.trim();
    if (dto.rsaPrivateKey && dto.rsaPrivateKey.trim())
      c.rsaPrivateKey = dto.rsaPrivateKey.trim();
    await this.repo.save(c);
    return this.toAdminView(c);
  }

  /** Backend-only: full credentials for the PayWay service. */
  async getCredentials(): Promise<PaymentCredentials> {
    const c = await this.getOrCreate();
    return {
      enabled: c.enabled,
      sandbox: c.sandbox,
      merchantId: c.merchantId,
      apiKey: c.apiKey,
      rsaPrivateKey: c.rsaPrivateKey,
      webhookUrl: c.webhookUrl,
      baseUrl: c.sandbox ? SANDBOX_BASE : PRODUCTION_BASE,
    };
  }
}
