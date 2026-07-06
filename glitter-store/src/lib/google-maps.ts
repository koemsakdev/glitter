'use client';

import { useJsApiLoader } from '@react-google-maps/api';

/**
 * Shared Google Maps JS API loader for the storefront. Loaded once via a stable
 * `id`. The key comes from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` — when it's unset
 * the picker degrades gracefully and checkout still works with a typed address.
 */
export function useGoogleMaps() {
    return useJsApiLoader({
        id: 'glitter-store-google-maps',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    });
}

export const MAPS_ENABLED = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
);

/** Phnom Penh — fallback center when no valid coordinates are provided. */
export const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 } as const;
