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
    /** Older notifications exist beyond this page. */
    hasMore?: boolean;
}

const KEY = ['notifications'] as const;

async function fetchNotifications(): Promise<NotificationList> {
    const { data } =
        await apiClient.get<NotificationList>('/api/notifications');
    return data;
}

/** List + unread count, kept fresh live by the RealtimeListener (socket). */
export function useNotifications() {
    const qc = useQueryClient();
    const query = useQuery({ queryKey: KEY, queryFn: fetchNotifications });

    const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

    // Update the bell straight away, then confirm with the server.
    const patchCache = (update: (list: NotificationList) => NotificationList) =>
        qc.setQueryData<NotificationList>(KEY, (old) =>
            old ? update(old) : old,
        );

    const markRead = useMutation({
        mutationFn: (id: string) =>
            apiClient.patch(`/api/notifications/${id}/read`),
        onMutate: (id: string) =>
            patchCache((list) => {
                const hit = list.data.find((n) => n.id === id && !n.isRead);
                return hit
                    ? {
                          data: list.data.map((n) =>
                              n.id === id ? { ...n, isRead: true } : n,
                          ),
                          unread: Math.max(0, list.unread - 1),
                      }
                    : list;
            }),
        onSettled: invalidate,
    });

    const markAll = useMutation({
        mutationFn: () => apiClient.patch('/api/notifications/read-all'),
        onMutate: () =>
            patchCache((list) => ({
                data: list.data.map((n) => ({ ...n, isRead: true })),
                unread: 0,
            })),
        onSettled: invalidate,
    });

    return {
        notifications: query.data?.data ?? [],
        unread: query.data?.unread ?? 0,
        isLoading: query.isLoading,
        markRead,
        markAll,
    };
}
