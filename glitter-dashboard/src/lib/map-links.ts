/**
 * Helpers for building Google Maps deep links from coordinates.
 * Used so users can jump from our embedded (Leaflet) map into the real
 * Google Maps app/site to view a pin or get turn-by-turn directions.
 */

/** Opens Google Maps centered on the location with a dropped pin. */
export function googleMapsViewUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Opens Google Maps directions with the location as the destination. */
export function googleMapsDirectionsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
