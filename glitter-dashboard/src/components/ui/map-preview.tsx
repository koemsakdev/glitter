'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';

if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl:
            'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
}

interface MapPreviewProps {
    latitude: number;
    longitude: number;
    zoom?: number;
    height?: number;
}

/**
 * Read-only map preview — no click/drag interaction.
 */
export function MapPreview({
                               latitude,
                               longitude,
                               zoom = 16,
                               height = 240,
                           }: MapPreviewProps) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return (
        <div
            className="overflow-hidden rounded-lg border border-border/60"
            style={{ height }}
        >
            <MapContainer
                center={[latitude, longitude]}
                zoom={zoom}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[latitude, longitude]} />
            </MapContainer>
        </div>
    );
}