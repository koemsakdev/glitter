/**
 * Place search for the map picker.
 *
 * Primary provider: Mapbox Geocoding v6 (good business/POI coverage, free tier,
 * needs only a public token in `NEXT_PUBLIC_MAPBOX_TOKEN`).
 * Fallback: Photon / OpenStreetMap (no key) — used when no Mapbox token is set,
 * so search keeps working, just with weaker business coverage.
 */

export interface GeocodeResult {
    lat: number;
    lng: number;
    /** Bold first line, e.g. a place/business name or street */
    primary: string;
    /** Muted second line, e.g. district / city / country */
    secondary: string;
    /** Best-effort full address to fill into a form */
    address: string;
    /** Best-effort city/province to fill into a form */
    city?: string;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Phnom Penh — used to bias results toward the local area.
const PROXIMITY_LNG = 104.9282;
const PROXIMITY_LAT = 11.5564;

function joinParts(...parts: (string | undefined)[]): string {
    return parts.filter(Boolean).join(', ');
}

/**
 * Searches for places matching `query`. Pass an `AbortSignal` to cancel an
 * in-flight request when the query changes.
 */
export async function searchPlaces(
    query: string,
    signal?: AbortSignal,
): Promise<GeocodeResult[]> {
    const q = query.trim();
    if (q.length < 3) return [];
    return MAPBOX_TOKEN
        ? searchMapbox(q, MAPBOX_TOKEN, signal)
        : searchPhoton(q, signal);
}

/** True when a Mapbox token is configured (used to surface setup hints). */
export const hasMapboxToken = Boolean(MAPBOX_TOKEN);

// ---------------------------------------------------------------------------
// Mapbox Geocoding v6
// ---------------------------------------------------------------------------

interface MapboxContextItem {
    name?: string;
}

interface MapboxFeature {
    geometry: { coordinates: [number, number] }; // [lng, lat]
    properties: {
        name?: string;
        name_preferred?: string;
        place_formatted?: string;
        full_address?: string;
        coordinates?: { longitude: number; latitude: number };
        context?: {
            street?: MapboxContextItem;
            neighborhood?: MapboxContextItem;
            locality?: MapboxContextItem;
            place?: MapboxContextItem;
            region?: MapboxContextItem;
            country?: MapboxContextItem;
        };
    };
}

function mapMapboxFeature(feature: MapboxFeature): GeocodeResult {
    const p = feature.properties;
    const [geomLng, geomLat] = feature.geometry.coordinates;
    const lat = p.coordinates?.latitude ?? geomLat;
    const lng = p.coordinates?.longitude ?? geomLng;

    const primary = p.name || p.name_preferred || 'Unnamed location';
    const secondary = p.place_formatted ?? '';
    const address = p.full_address || joinParts(primary, secondary);
    const city =
        p.context?.place?.name ??
        p.context?.locality?.name ??
        p.context?.region?.name;

    return { lat, lng, primary, secondary, address, city };
}

async function searchMapbox(
    q: string,
    token: string,
    signal?: AbortSignal,
): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
        q,
        access_token: token,
        limit: '8',
        language: 'en',
        autocomplete: 'true',
        country: 'kh',
        proximity: `${PROXIMITY_LNG},${PROXIMITY_LAT}`,
    });

    const res = await fetch(
        `https://api.mapbox.com/search/geocode/v6/forward?${params}`,
        { signal },
    );
    if (!res.ok) throw new Error(`Mapbox responded ${res.status}`);

    const data = (await res.json()) as { features?: MapboxFeature[] };
    return (data.features ?? []).map(mapMapboxFeature);
}

// ---------------------------------------------------------------------------
// Photon / OpenStreetMap fallback
// ---------------------------------------------------------------------------

interface PhotonProperties {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
}

interface PhotonFeature {
    geometry: { coordinates: [number, number] }; // [lng, lat]
    properties: PhotonProperties;
}

function mapPhotonFeature(feature: PhotonFeature): GeocodeResult {
    const [lng, lat] = feature.geometry.coordinates;
    const p = feature.properties;

    const street = [p.housenumber, p.street].filter(Boolean).join(' ');
    const primary = p.name || street || p.city || 'Unnamed location';
    const secondary = joinParts(
        p.name ? street : undefined,
        p.district,
        p.city,
        p.state,
        p.country,
    );
    const address =
        p.name && street ? `${p.name}, ${street}` : street || p.name || primary;
    const city = p.city || p.county || p.state;

    return { lat, lng, primary, secondary, address, city };
}

async function searchPhoton(
    q: string,
    signal?: AbortSignal,
): Promise<GeocodeResult[]> {
    const params = new URLSearchParams({
        q,
        limit: '8',
        lang: 'en',
        lat: String(PROXIMITY_LAT),
        lon: String(PROXIMITY_LNG),
    });

    const res = await fetch(`https://photon.komoot.io/api/?${params}`, {
        signal,
    });
    if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);

    const data = (await res.json()) as { features?: PhotonFeature[] };
    return (data.features ?? []).map(mapPhotonFeature);
}
