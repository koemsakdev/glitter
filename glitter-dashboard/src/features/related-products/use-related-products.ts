import { useQuery } from '@tanstack/react-query';
import { relatedProductApi } from './related-product-api';

export function useProductRelated(productId?: string) {
    return useQuery({
        queryKey: ['related-products', productId],
        queryFn: () => relatedProductApi.get(productId as string),
        enabled: Boolean(productId),
    });
}
