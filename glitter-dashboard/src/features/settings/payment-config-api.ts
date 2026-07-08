import { apiClient } from '@/lib/api-client';

/** Secrets are never returned — only presence flags. */
export interface PaymentConfigView {
    enabled: boolean;
    sandbox: boolean;
    merchantId: string;
    webhookUrl: string;
    rsaPublicKey: string;
    hasApiKey: boolean;
    hasRsaPrivateKey: boolean;
}

export interface PaymentConfigInput {
    enabled?: boolean;
    sandbox?: boolean;
    merchantId?: string;
    apiKey?: string;
    rsaPublicKey?: string;
    rsaPrivateKey?: string;
    webhookUrl?: string;
}

export const paymentConfigApi = {
    async get(): Promise<PaymentConfigView> {
        const { data } = await apiClient.get<PaymentConfigView>(
            '/api/payment-config',
        );
        return data;
    },
    async update(input: PaymentConfigInput): Promise<PaymentConfigView> {
        const { data } = await apiClient.put<PaymentConfigView>(
            '/api/payment-config',
            input,
        );
        return data;
    },
};
