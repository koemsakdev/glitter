import { apiClient } from '@/lib/api-client';

/** Admin-only view — includes the secret values so the admin can review/edit
 *  them (the endpoint is role-guarded and never exposed to the storefront). */
export interface PaymentConfigView {
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

export interface PaymentConfigInput {
    enabled?: boolean;
    sandbox?: boolean;
    merchantId?: string;
    apiKey?: string;
    rsaPublicKey?: string;
    rsaPrivateKey?: string;
    webhookUrl?: string;
}

export interface AbaTestResult {
    environment: 'sandbox' | 'production';
    merchantId: string;
    checks: {
        id: 'credentials' | 'khqr_api' | 'hosted_checkout';
        ok: boolean;
        detail: string;
    }[];
}

export const paymentConfigApi = {
    /** Live check against ABA with the SAVED settings. */
    async test(): Promise<AbaTestResult> {
        const { data } = await apiClient.get<{ data: AbaTestResult }>(
            '/api/payment-config/test',
        );
        return data.data;
    },
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
