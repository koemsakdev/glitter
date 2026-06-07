'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import * as React from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

// Fix Leaflet's default icon paths (they break in bundlers like Next.js)
// We override to use CDN-hosted icons.
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

interface MapPickerProps {
    latitude: number;
    longitude: number;
    onChange: (lat: number, lng: number) => void;
    zoom?: number;
    height?: number;
}

/**
 * Interactive map for selecting coordinates by clicking or dragging the marker.
 */
export function MapPicker({
                              latitude,
                              longitude,
                              onChange,
                              zoom = 15,
                              height = 320,
                          }: MapPickerProps) {
    const safeLat = Number.isFinite(latitude) ? latitude : 11.5564;
    const safeLng = Number.isFinite(longitude) ? longitude : 104.9282;

    return (
        <div
            className="overflow-hidden rounded-lg border border-border/60"
            style={{ height }}
        >
            <MapContainer
                center={[safeLat, safeLng]}
                zoom={zoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickHandler onChange={onChange} />
                <DraggableMarker
                    lat={safeLat}
                    lng={safeLng}
                    onChange={onChange}
                />
            </MapContainer>
        </div>
    );
}

/** Internal: capture map clicks to update the pin location. */
function ClickHandler({
                          onChange,
                      }: {
    onChange: (lat: number, lng: number) => void;
}) {
    useMapEvents({
        click(e) {
            onChange(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

/** Internal: draggable marker that emits new coordinates on drag end. */
function DraggableMarker({
                             lat,
                             lng,
                             onChange,
                         }: {
    lat: number;
    lng: number;
    onChange: (lat: number, lng: number) => void;
}) {
    const markerRef = React.useRef<L.Marker>(null);

    return (
        <Marker
            draggable
            position={[lat, lng]}
            ref={markerRef}
            eventHandlers={{
                dragend() {
                    const m = markerRef.current;
                    if (m) {
                        const pos = m.getLatLng();
                        onChange(pos.lat, pos.lng);
                    }
                },
            }}
        />
    );
}