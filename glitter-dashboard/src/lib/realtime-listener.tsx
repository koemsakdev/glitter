'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { NotificationToast } from '@/components/feedback/notification-toast';
import type {
    AppNotification,
    NotificationList,
} from '@/features/notifications/notification-api';
import { apiClient } from '@/lib/api-client';
import { getRealtimeSocket } from '@/lib/realtime-socket';
import { useAuthStore } from '@/stores/auth-store';
import { toast as sonner } from 'sonner';

/** Maps a change event entity to the TanStack Query key(s) to invalidate. */
const KEY_MAP: Record<string, string[][]> = {
    'store-config': [['app-settings']],
    banners: [['banners']],
    menu: [['menu']],
    pages: [['pages']],
    reviews: [['reviews']],
    shipments: [['shipments'], ['orders']],
    advertisements: [['advertisements']],
    wishlists: [['wishlists']],
    colors: [['colors']],
    badges: [['badges'], ['products']],
    // A new/updated order changes stock, the dashboard numbers and reports.
    orders: [['orders'], ['dashboard'], ['reports'], ['inventory-branch']],
    notifications: [['notifications']],
    products: [
        ['products'],
        ['product-variants'],
        ['product-badges'],
        ['product-images'],
        ['inventory-branch'],
    ],
    categories: [['categories']],
    brands: [['brands']],
    branches: [['branches']],
};

/**
 * Keeps the dashboard live over one Socket.IO connection:
 * - `change`       → refetch the affected lists (another admin, the store…)
 * - `notification` → drop it into the bell instantly and pop a chat-style
 *                    alert (e.g. "New order GS-0042") with a soft sound.
 */
export function RealtimeListener() {
    const queryClient = useQueryClient();
    const router = useRouter();
    const userId = useAuthStore((s) => s.user?.id ?? null);
    const routerRef = useRef(router);
    useEffect(() => {
        routerRef.current = router;
    }, [router]);

    useEffect(() => {
        const socket = getRealtimeSocket();
        // Re-handshake so the server puts this tab in the signed-in user's
        // room (or takes it out after logout).
        socket.disconnect().connect();

        let wasConnected = false;
        const onConnect = () => {
            // After a drop we may have missed events — refresh what's on screen.
            if (wasConnected) {
                void queryClient.invalidateQueries({ refetchType: 'active' });
            }
            wasConnected = true;
        };

        const onChange = (event: { entity?: string }) => {
            const keys = event.entity ? KEY_MAP[event.entity] : undefined;
            keys?.forEach(
                (queryKey) => void queryClient.invalidateQueries({ queryKey }),
            );
        };

        const onNotification = (n: AppNotification) => {
            // Show it in the bell immediately, then confirm with the server.
            queryClient.setQueryData<NotificationList>(
                ['notifications'],
                (old) =>
                    old && !old.data.some((x) => x.id === n.id)
                        ? { data: [n, ...old.data], unread: old.unread + 1 }
                        : old,
            );
            sonner.custom(
                (id) => (
                    <NotificationToast
                        id={id}
                        notification={n}
                        onOpen={(href) => routerRef.current.push(href)}
                    />
                ),
                { duration: 8000 },
            );
            playPing();
        };

        // Token expired → let the API client refresh it, then re-handshake.
        const onAuthError = () => {
            apiClient
                .get('/api/notifications')
                .then(() => socket.disconnect().connect())
                .catch(() => {});
        };

        socket.on('connect', onConnect);
        socket.on('change', onChange);
        socket.on('notification', onNotification);
        socket.on('auth_error', onAuthError);
        return () => {
            socket.off('connect', onConnect);
            socket.off('change', onChange);
            socket.off('notification', onNotification);
            socket.off('auth_error', onAuthError);
        };
    }, [queryClient, userId]);

    return null;
}

/** A short two-note chime (no audio file needed). Silently skipped if the
 * browser blocks audio before the first user interaction. */
function playPing() {
    try {
        const Ctx =
            window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
                .webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const now = ctx.currentTime;
        [880, 1320].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const start = now + i * 0.12;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.15, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
            osc.connect(gain).connect(ctx.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        });
        setTimeout(() => void ctx.close(), 800);
    } catch {
        // audio not allowed — the visual alert is enough
    }
}
