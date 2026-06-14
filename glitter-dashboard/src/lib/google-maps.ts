'use client';

import { useJsApiLoader } from '@react-google-maps/api';

/**
 * Shared Google Maps JS API loader.
 *
 * Both the map preview (detail pages) and the map picker (forms) call this with
 * the same `id`, so the script is fetched and parsed only once for the whole app.
 * The API key comes from `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.
 *
 * Place search is handled separately (free OpenStreetMap/Photon geocoder), so we
 * don't load Google's billable `places` library.
 */
export function useGoogleMaps() {
    return useJsApiLoader({
        id: 'glitter-google-maps',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '',
    });
}

/** Phnom Penh — fallback center when no valid coordinates are provided. */
export const DEFAULT_CENTER = { lat: 11.5564, lng: 104.9282 } as const;
