import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
    Review,
    ReviewListResponse,
    ReviewStatus,
} from '@/types/review';

const REVIEWS_KEY = ['reviews'] as const;

export function useReviews(status?: ReviewStatus) {
    return useQuery({
        queryKey: [...REVIEWS_KEY, status ?? 'all'],
        queryFn: async () => {
            const { data } = await apiClient.get<ReviewListResponse>(
                '/api/reviews',
                { params: { ...(status ? { status } : {}), limit: 100 } },
            );
            return data;
        },
        // Keep showing the current list while switching tabs, so the page
        // doesn't blank out to a full-page loader on every filter click.
        placeholderData: keepPreviousData,
    });
}

export function useSetReviewStatus() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: ReviewStatus;
        }) => {
            const { data } = await apiClient.patch<{ data: Review }>(
                `/api/reviews/${id}/status`,
                { status },
            );
            return data.data;
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: REVIEWS_KEY });
        },
    });
}

export function useDeleteReview() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => apiClient.delete(`/api/reviews/${id}`),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: REVIEWS_KEY });
        },
    });
}
