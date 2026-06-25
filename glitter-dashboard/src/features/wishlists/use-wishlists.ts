import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@/types/product';
import type { WishlistProductStat } from '@/types/wishlist';

export function useMostWishlisted(limit = 5) {
    return useQuery({
        queryKey: ['wishlists', 'most', limit],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                data: WishlistProductStat[];
            }>('/api/wishlists/most-wishlisted', { params: { limit } });
            return data.data;
        },
    });
}

export function useProductWishlistCount(productId: string | undefined) {
    return useQuery({
        queryKey: ['wishlists', 'product-count', productId],
        queryFn: async () => {
            const { data } = await apiClient.get<{ count: number }>(
                `/api/wishlists/product/${productId}/count`,
            );
            return data.count;
        },
        enabled: Boolean(productId),
    });
}

export function useWishlistCounts() {
    return useQuery({
        queryKey: ['wishlists', 'counts'],
        queryFn: async () => {
            const { data } = await apiClient.get<{
                data: Record<string, number>;
            }>('/api/wishlists/counts');
            return data.data;
        },
    });
}

export function useCustomerWishlist(userId: string | undefined) {
    return useQuery({
        queryKey: ['wishlists', 'customer', userId],
        queryFn: async () => {
            const { data } = await apiClient.get<{ data: Product[] }>(
                `/api/wishlists/customer/${userId}`,
            );
            return data.data;
        },
        enabled: Boolean(userId),
    });
}
