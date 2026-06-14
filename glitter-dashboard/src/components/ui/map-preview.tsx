'use client';

import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { useGoogleMaps } from '@/lib/google-maps';

interface MapPreviewProps {
    latitude: number;
    longitude: number;
    zoom?: number;
    height?: number;
    /** Marker tooltip / title */
    label?: string;
    /** Reserved for callers that pass an address; used as the marker title fallback */
    address?: string;
}

const containerStyle = { width: '100%', height: '100%' };

/**
 * Read-only Google Maps preview for detail pages.
 * Pan/zoom are enabled; scroll-zoom requires Ctrl (cooperative) so it never
 * hijacks page scrolling.
 */
export function MapPreview({
    latitude,
    longitude,
    zoom = 16,
    height = 240,
    label,
    address,
}: MapPreviewProps) {
    const { isLoaded, loadError } = useGoogleMaps();

    const center = React.useMemo(
        () => ({ lat: latitude, lng: longitude }),
        [latitude, longitude],
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return (
        <div
            className="relative overflow-hidden rounded-lg border border-border/60 bg-muted/40"
            style={{ height }}
        >
            {loadError ? (
                <div className="flex size-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                    Map could not be loaded.
                </div>
            ) : !isLoaded ? (
                <div className="flex size-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={zoom}
                    options={{
                        mapTypeControl: true,
                        // Keep the Map/Satellite toggle at the top-left; the
                        // "Open in Google Maps" button sits at the top-right.
                        mapTypeControlOptions: {
                            position: google.maps.ControlPosition.TOP_LEFT,
                        },
                        streetViewControl: false,
                        fullscreenControl: false,
                        zoomControl: true,
                        gestureHandling: 'cooperative',
                        clickableIcons: false,
                    }}
                >
                    <MarkerF position={center} title={label ?? address} />
                </GoogleMap>
            )}
        </div>
    );
}
