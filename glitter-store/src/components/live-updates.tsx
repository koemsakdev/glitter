'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { expireLiveTags } from '@/app/actions/live';
import { useAuth } from '@/lib/auth';
import { LIVE_TAGS } from '@/lib/live-tags';
import { getLiveSocket, onLiveChange, reconnectLive } from '@/lib/realtime';

const REFRESH_ON = Object.keys(LIVE_TAGS);

/**
 * Keeps the storefront live over the shared Socket.IO connection: whenever
 * storefront-relevant data changes in the dashboard (a product added, edited
 * or deleted, a banner, the menu…), cached fetches are expired
 * (expireLiveTags) and the page soft-refreshes — no manual reload.
 */
export function LiveUpdates() {
    const router = useRouter();
    const { user } = useAuth();
    const userId = user?.id ?? null;

    // Sign-in / sign-out → re-handshake so we join (or leave) our own room.
    useEffect(() => {
        reconnectLive();
    }, [userId]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        const changed = new Set<string>();

        const scheduleRefresh = () => {
            // A single dashboard save often emits several events in a row (the
            // product PATCH first, then its badges / related set). Debounce so
            // we refresh once, AFTER the burst settles, and read the final
            // committed state instead of an intermediate one.
            clearTimeout(timer);
            timer = setTimeout(() => {
                const events = [...changed];
                changed.clear();
                expireLiveTags(events)
                    .catch(() => {})
                    .finally(() => router.refresh());
            }, 300);
        };

        const off = onLiveChange(REFRESH_ON, (entity) => {
            changed.add(entity);
            scheduleRefresh();
        });

        // After a dropped connection (API restart, Wi-Fi blip) we may have
        // missed events — refresh once when it comes back.
        const socket = getLiveSocket();
        let wasConnected = socket.connected;
        const onConnect = () => {
            if (wasConnected) scheduleRefresh();
            wasConnected = true;
        };
        socket.on('connect', onConnect);

        return () => {
            off();
            socket.off('connect', onConnect);
            clearTimeout(timer);
        };
    }, [router]);

    return null;
}
