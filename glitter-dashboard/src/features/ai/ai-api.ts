import { apiClient } from '@/lib/api-client';

export type AiBrandField = 'websiteUrl' | 'description';
export type AiCategoryField = 'description';
export type AiLanguage = 'en' | 'km';

export interface GenerateBrandInfoRequest {
  name: string;
  field: AiBrandField;
  language?: AiLanguage;
}

export interface GenerateCategoryInfoRequest {
  name: string;
  field: AiCategoryField;
  language?: AiLanguage;
}

export interface GenerateInfoResponse {
  value: string;
  field: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export const aiApi = {
  async generateBrandInfo(
      request: GenerateBrandInfoRequest,
  ): Promise<GenerateInfoResponse> {
    const { data } = await apiClient.post<ApiEnvelope<GenerateInfoResponse>>(
        '/api/ai/brand',
        request,
    );
    return data.data;
  },

  async generateCategoryInfo(
      request: GenerateCategoryInfoRequest,
  ): Promise<GenerateInfoResponse> {
    const { data } = await apiClient.post<ApiEnvelope<GenerateInfoResponse>>(
        '/api/ai/category',
        request,
    );
    return data.data;
  },

  async generateProductInfo(params: {
    name: string;
    brandName?: string;
    categoryName?: string;
    field: 'description' | 'details';
    language: 'en' | 'km';
  }): Promise<{ value: string }> {
    const { data } = await apiClient.post<{ value: string }>(
        '/api/ai/product',
        params,
    );
    return data;
  },
};