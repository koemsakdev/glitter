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
 * Subscribes to the API's SSE stream and soft-refreshes the page (re-runs the
 * server components) whenever storefront-relevant data changes in the
 * dashboard — so config/menu edits appear instantly without a manual reload.
 */
export function LiveUpdates() {
    const router = useRouter();

    useEffect(() => {
        const source = new EventSource(`${API_URL}/api/realtime/events`);
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { entity?: string };
                if (data.entity && REFRESH_ON.has(data.entity)) {
                    router.refresh();
                }
            } catch {
                // ignore malformed events
            }
        };
        // EventSource reconnects automatically on error.
        return () => source.close();
    }, [router]);

    return null;
}
