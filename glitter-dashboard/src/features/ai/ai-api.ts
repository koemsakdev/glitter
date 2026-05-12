import { apiClient } from '@/lib/api-client';

export type AiBrandField = 'websiteUrl' | 'description';

export interface GenerateBrandInfoRequest {
  name: string;
  field: AiBrandField;
  language?: 'en' | 'km';
}

export interface GenerateBrandInfoResponse {
  value: string;
  field: AiBrandField;
}

interface ApiEnvelope<T> {
  data: T;
}

export const aiApi = {
  async generateBrandInfo(
    request: GenerateBrandInfoRequest,
  ): Promise<GenerateBrandInfoResponse> {
    const { data } = await apiClient.post<ApiEnvelope<GenerateBrandInfoResponse>>(
      '/api/ai/brand',
      request,
    );
    return data.data;
  },
};