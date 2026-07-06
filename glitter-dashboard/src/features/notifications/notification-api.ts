import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface AppNotification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    link: string | null;
    isRead: boolean;
    createdAt: string;
}

export interface NotificationList {
    data: AppNotification[];
    unread: number;
}

const KEY = ['notifications'] as const;

async function fetchNotifications(): Promise<NotificationList> {
    const { data } = await apiClient.get<NotificationList>(
        '/api/notifications',
    );
    return data;
}

/** List + unread count, kept fresh live by the RealtimeListener (SSE). */
export function useNotifications() {
    const qc = useQueryClient();
    const query = useQuery({ queryKey: KEY, queryFn: fetchNotifications });

    const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

    const markRead = useMutation({
        mutationFn: (id: string) =>
            apiClient.patch(`/api/notifications/${id}/read`),
        onSuccess: invalidate,
    });

    const markAll = useMutation({
        mutationFn: () => apiClient.patch('/api/notifications/read-all'),
        onSuccess: invalidate,
    });

    return {
        notifications: query.data?.data ?? [],
        unread: query.data?.unread ?? 0,
        isLoading: query.isLoading,
        markRead,
        markAll,
    };
}
