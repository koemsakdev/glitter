'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** Maps a change event entity to the TanStack Query key(s) to invalidate. */
const KEY_MAP: Record<string, string[]> = {
    'store-config': ['app-settings'],
    banners: ['banners'],
    menu: ['menu'],
    pages: ['pages'],
    reviews: ['reviews'],
    shipments: ['shipments'],
    advertisements: ['advertisements'],
    wishlists: ['wishlists'],
    colors: ['colors'],
    badges: ['badges'],
    orders: ['orders'],
    products: ['products'],
    categories: ['categories'],
    brands: ['brands'],
    branches: ['branches'],
};

/**
 * Subscribes to the API's SSE stream and invalidates the matching queries so
 * dashboard lists refetch live when anything changes (including edits made in
 * another tab or by another admin).
 */
export function RealtimeListener() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const source = new EventSource(`${API_URL}/api/realtime/events`);
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { entity?: string };
                const key = data.entity ? KEY_MAP[data.entity] : undefined;
                if (key) {
                    void queryClient.invalidateQueries({ queryKey: key });
                }
            } catch {
                // ignore malformed events
            }
        };
        return () => source.close();
    }, [queryClient]);

    return null;
}
