import { useMutation } from '@tanstack/react-query';
import { aiApi } from './ai-api';

export function useGenerateBrandInfo() {
  return useMutation({
    mutationFn: aiApi.generateBrandInfo,
  });
}

export function useGenerateCategoryInfo() {
  return useMutation({
    mutationFn: aiApi.generateCategoryInfo,
  });
}

export function useGenerateProductInfo() {
  return useMutation({
    mutationFn: (params: {
      name: string;
      brandName?: string;
      categoryName?: string;
      field: 'description' | 'details';
      language: 'en' | 'km';
    }) => aiApi.generateProductInfo(params),
  });
}