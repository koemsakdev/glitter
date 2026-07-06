'use client';

import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Layers, Loader2, LocateFixed, MapPin, Search } from 'lucide-react';
import * as React from 'react';
import { DEFAULT_CENTER, useGoogleMaps } from '@/lib/google-maps';
import {
    reverseGeocode,
    searchPlaces,
    type GeocodeResult,
} from '@/lib/geocode';

interface MapPickerProps {
    latitude: number;
    longitude: number;
    /**
     * Called when the location changes. `address`/`city` are only provided when
     * the change came from a search result (clicks/drags pass just coordinates).
     */
    onChange: (
        lat: number,
        lng: number,
        address?: string,
        city?: string,
    ) => void;
    zoom?: number;
    height?: number;
    /** Placeholder for the search box */
    searchPlaceholder?: string;
    /** Message shown when a search returns nothing */
    searchNoResultsText?: string;
    /** Show a "use my current location" button (browser geolocation). */
    showCurrentLocation?: boolean;
    /** Reverse-geocode pin drops / current location so `address` is filled. */
    reverseOnPick?: boolean;
    /** Auto-detect the current location once when the map loads. */
    autoLocate?: boolean;
    /** Label for the current-location button. */
    currentLocationText?: string;
}

const containerStyle = { width: '100%', height: '100%' };

/**
 * Interactive Google Maps picker. Three ways to set the location:
 *  - Type a place/address in the search box and pick a suggestion (free OSM search)
 *  - Click anywhere on the map
 *  - Drag the marker
 *
 * Dropping a pin does not recenter the map (feels natural); choosing a search
 * result pans the map to it.
 */
export function MapPicker({
    latitude,
    longitude,
    onChange,
    zoom = 15,
    height = 320,
    searchPlaceholder = 'Search for a place or address',
    searchNoResultsText = 'No places found. Try a street, market, or area name.',
    showCurrentLocation = false,
    reverseOnPick = false,
    autoLocate = false,
    currentLocationText = 'Use my current location',
}: MapPickerProps) {
    const { isLoaded, loadError } = useGoogleMaps();
    const [locating, setLocating] = React.useState(false);
    const [mapType, setMapType] = React.useState<'roadmap' | 'hybrid'>(
        'roadmap',
    );

    // Initial viewport center — captured once so dropping pins doesn't recenter.
    const [center] = React.useState(() => ({
        lat: Number.isFinite(latitude) ? latitude : DEFAULT_CENTER.lat,
        lng: Number.isFinite(longitude) ? longitude : DEFAULT_CENTER.lng,
    }));

    const mapRef = React.useRef<google.maps.Map | null>(null);

    const toggleMapType = React.useCallback(() => {
        setMapType((t) => {
            const next = t === 'roadmap' ? 'hybrid' : 'roadmap';
            mapRef.current?.setMapTypeId(next);
            return next;
        });
    }, []);

    const markerPosition = {
        lat: Number.isFinite(latitude) ? latitude : center.lat,
        lng: Number.isFinite(longitude) ? longitude : center.lng,
    };

    const emitCoords = React.useCallback(
        (lat: number, lng: number) => {
            onChange(lat, lng);
            if (reverseOnPick) {
                void reverseGeocode(lat, lng).then((result) => {
                    if (result) onChange(lat, lng, result.address, result.city);
                });
            }
        },
        [onChange, reverseOnPick],
    );

    const emit = React.useCallback(
        (e: google.maps.MapMouseEvent) => {
            if (e.latLng) emitCoords(e.latLng.lat(), e.latLng.lng());
        },
        [emitCoords],
    );

    const handleCurrentLocation = React.useCallback(() => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude: lat, longitude: lng } = pos.coords;
                mapRef.current?.panTo({ lat, lng });
                mapRef.current?.setZoom(17);
                emitCoords(lat, lng);
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }, [emitCoords]);

    // Auto-detect the current location once when the map is ready.
    const autoTriedRef = React.useRef(false);
    React.useEffect(() => {
        if (autoLocate && isLoaded && !autoTriedRef.current) {
            autoTriedRef.current = true;
            handleCurrentLocation();
        }
    }, [autoLocate, isLoaded, handleCurrentLocation]);

    const handleSearchSelect = React.useCallback(
        (result: GeocodeResult) => {
            onChange(result.lat, result.lng, result.address, result.city);
            mapRef.current?.panTo({ lat: result.lat, lng: result.lng });
            mapRef.current?.setZoom(16);
        },
        [onChange],
    );

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
                <>
                    <GoogleMap
                        mapContainerStyle={containerStyle}
                        center={center}
                        zoom={zoom}
                        onLoad={(map) => {
                            mapRef.current = map;
                        }}
                        onUnmount={() => {
                            mapRef.current = null;
                        }}
                        onClick={emit}
                        mapTypeId={mapType}
                        options={{
                            mapTypeControl: false,
                            streetViewControl: false,
                            fullscreenControl: false,
                            zoomControl: true,
                            gestureHandling: 'greedy',
                            clickableIcons: false,
                        }}
                    >
                        <MarkerF
                            position={markerPosition}
                            draggable
                            onDragEnd={emit}
                        />
                    </GoogleMap>

                    {/* Prominent search bar, like Google Maps */}
                    <PlaceSearchBox
                        placeholder={searchPlaceholder}
                        noResultsText={searchNoResultsText}
                        onSelect={handleSearchSelect}
                    />

                    {/* Layers (map type) toggle — bottom-left */}
                    <button
                        type="button"
                        onClick={toggleMapType}
                        className="absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-xl bg-white p-1.5 pr-3 shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:bg-gray-50"
                        aria-label="Toggle map layers"
                    >
                        <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-blue-600 text-white">
                            <Layers className="size-4" />
                        </span>
                        <span className="text-xs font-medium text-gray-800">
                            {mapType === 'roadmap' ? 'Satellite' : 'Map'}
                        </span>
                    </button>

                    {/* Current location — bottom-right (Google-style round button) */}
                    {showCurrentLocation && (
                        <button
                            type="button"
                            onClick={handleCurrentLocation}
                            disabled={locating}
                            title={currentLocationText}
                            className="absolute bottom-3 right-3 z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:bg-gray-50 disabled:opacity-60"
                        >
                            {locating ? (
                                <Loader2 className="size-5 animate-spin text-gray-500" />
                            ) : (
                                <LocateFixed className="size-5 text-pink-500" />
                            )}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}

/** Free OSM/Photon search box overlaid on the top-left of the map. */
function PlaceSearchBox({
    placeholder,
    noResultsText,
    onSelect,
}: {
    placeholder: string;
    noResultsText: string;
    onSelect: (result: GeocodeResult) => void;
}) {
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<GeocodeResult[]>([]);
    const [open, setOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const boxRef = React.useRef<HTMLDivElement>(null);
    const abortRef = React.useRef<AbortController | null>(null);

    // Debounced search as the user types
    React.useEffect(() => {
        const q = query.trim();
        const handle = window.setTimeout(async () => {
            if (q.length < 3) {
                setResults([]);
                setLoading(false);
                return;
            }
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;
            setLoading(true);
            try {
                const found = await searchPlaces(q, controller.signal);
                setResults(found);
                setOpen(true);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setResults([]);
                    setOpen(true);
                }
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => window.clearTimeout(handle);
    }, [query]);

    // Close the dropdown when clicking outside
    React.useEffect(() => {
        function onDocPointerDown(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onDocPointerDown);
        return () =>
            document.removeEventListener('mousedown', onDocPointerDown);
    }, []);

    function handlePick(result: GeocodeResult) {
        onSelect(result);
        setQuery(result.primary);
        setResults([]);
        setOpen(false);
    }

    const showDropdown = open && query.trim().length >= 3;

    return (
        <div
            ref={boxRef}
            className="absolute left-3 top-3 z-10 w-[62%] max-w-[18rem]"
        >
            {/* Prominent rounded search bar, like the Google Maps app */}
            <div className="relative flex items-center rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                <Search className="pointer-events-none absolute left-4 size-5 text-gray-500" />
                <input
                    type="text"
                    value={query}
                    placeholder={placeholder}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.trim().length >= 3 && setOpen(true)}
                    // Prevent Enter from submitting the surrounding form
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault();
                        if (e.key === 'Escape') setOpen(false);
                    }}
                    className="h-12 w-full rounded-full border-0 bg-transparent pl-12 pr-10 text-sm text-gray-900 placeholder:text-gray-500 outline-none"
                />
                {loading && (
                    <Loader2 className="absolute right-4 size-4 animate-spin text-gray-500" />
                )}
            </div>

            {showDropdown && (
                <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                    {results.length > 0 ? (
                        <ul className="max-h-64 overflow-y-auto py-1">
                            {results.map((result, i) => (
                                <li key={`${result.lat},${result.lng},${i}`}>
                                    <button
                                        type="button"
                                        onClick={() => handlePick(result)}
                                        className="flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-gray-100"
                                    >
                                        <MapPin className="mt-0.5 size-4 shrink-0 text-gray-500" />
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm text-gray-900">
                                                {result.primary}
                                            </span>
                                            {result.secondary && (
                                                <span className="block truncate text-xs text-gray-500">
                                                    {result.secondary}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        !loading && (
                            <p className="px-3 py-3 text-sm text-gray-500">
                                {noResultsText}
                            </p>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
