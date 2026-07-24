'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const REFRESH_ON = new Set([
    'store-config',
    'banners',
    'menu',
    'pages',
    'reviews',
    'products',
    'categories',
    'brands',
]);

/**
 * Subscribes to the API's SSE stream (a one-way live push, like a socket) and
 * soft-refreshes the page — re-running the server components — whenever
 * storefront-relevant data changes in the dashboard. Because storefront
 * fetches are `no-store`, `router.refresh()` pulls genuinely fresh data, so
 * edits appear without a manual reload or navigation.
 */
export function LiveUpdates() {
    const router = useRouter();

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let source: EventSource | null = null;
        let reconnect: ReturnType<typeof setTimeout> | undefined;
        let closed = false;

        const scheduleRefresh = () => {
            // A single dashboard save often emits several events in a row (the
            // product PATCH first, then its badges / related set). Debounce so
            // we refresh once, AFTER the burst settles, and read the final
            // committed state instead of an intermediate one.
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 400);
        };

        const connect = () => {
            // Never hold more than one stream, and never open one while the tab
            // is in the background — a browser only allows ~6 connections per
            // host, so a background tab's stream would needlessly occupy a slot
            // and can starve real requests (login, the chat, …) in other tabs.
            if (closed || source || document.visibilityState === 'hidden') return;
            source = new EventSource(`${API_URL}/api/realtime/events`);
            source.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as { entity?: string };
                    if (data.entity && REFRESH_ON.has(data.entity)) {
                        scheduleRefresh();
                    }
                } catch {
                    // ignore malformed events
                }
            };
            source.onerror = () => {
                // The stream dropped (e.g. the API restarted). Re-open it —
                // EventSource's built-in retry can stall after a CLOSED state.
                if (source && source.readyState === EventSource.CLOSED) {
                    disconnect();
                    clearTimeout(reconnect);
                    reconnect = setTimeout(connect, 2000);
                }
            };
        };

        const disconnect = () => {
            clearTimeout(reconnect);
            source?.close();
            source = null;
        };

        // Free the connection when the tab is hidden; restore it when visible.
        // On becoming visible again, also refresh once — while hidden the SSE
        // was closed, so we may have missed change events (e.g. an edit made in
        // the dashboard tab). This makes returning to the storefront show the
        // latest without a manual reload.
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                disconnect();
            } else {
                connect();
                scheduleRefresh();
            }
        };

        connect();
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            closed = true;
            document.removeEventListener('visibilitychange', onVisibility);
            clearTimeout(timer);
            disconnect();
        };
    }, [router]);

    return null;
}
