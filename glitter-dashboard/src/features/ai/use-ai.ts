import { useMutation } from '@tanstack/react-query';
import { aiApi } from './ai-api';

export function useGenerateBrandInfo() {
  return useMutation({
    mutationFn: aiApi.generateBrandInfo,
  });
}