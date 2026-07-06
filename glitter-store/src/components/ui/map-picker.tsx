'use client';

import { GoogleMap, MarkerF } from '@react-google-maps/api';
import {
    Check,
    Layers,
    Loader2,
    LocateFixed,
    MapPin,
    Maximize2,
    Search,
    X,
} from 'lucide-react';
import * as React from 'react';
import { DEFAULT_CENTER, useGoogleMaps } from '@/lib/google-maps';
import {
    reverseGeocode,
    searchPlaces,
    type GeocodeResult,
} from '@/lib/geocode';

interface MapPickerProps {
    latitude: number | null;
    longitude: number | null;
    /**
     * Called when the location changes. `address`/`city` are only provided when
     * the change came from a search result or reverse-geocode (clicks/drags
     * also reverse-geocode when `reverseOnPick` is on).
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
    /** Allow tapping the map to open a full-screen picker. Default true. */
    expandable?: boolean;
    /** Resolved address text, shown in the full-screen confirm bar. */
    addressText?: string;
    /** Hint shown over the small map inviting the user to open full screen. */
    expandHint?: string;
    /** Label for the confirm button in full-screen mode. */
    confirmText?: string;
}

const containerStyle = { width: '100%', height: '100%' };

/**
 * Interactive Google Maps picker. Three ways to set the location:
 *  - Type a place/address in the search box and pick a suggestion
 *  - Click anywhere on the map
 *  - Drag the marker
 *
 * The small inline map can be expanded to a full-screen picker (easier to
 * search and pin on a phone). The full-screen view edits the same location and
 * closes when the user confirms.
 */
export function MapPicker(props: MapPickerProps) {
    const {
        height = 320,
        expandable = true,
        expandHint = 'Tap to open full map',
        confirmText = 'Confirm this location',
        addressText,
        searchPlaceholder,
        searchNoResultsText,
        currentLocationText,
    } = props;

    const { isLoaded, loadError } = useGoogleMaps();
    const [expanded, setExpanded] = React.useState(false);

    // Close on Escape while full-screen is open.
    React.useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpanded(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [expanded]);

    return (
        <div
            className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
            style={{ height }}
        >
            {loadError ? (
                <div className="flex size-full items-center justify-center px-4 text-center text-sm text-zinc-500">
                    Map could not be loaded.
                </div>
            ) : !isLoaded ? (
                <div className="flex size-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-zinc-400" />
                </div>
            ) : (
                <>
                    <MapSurface {...props} />

                    {/* Expand to full screen — icon only, so it doesn't crowd
                        the search box. */}
                    {expandable && (
                        <button
                            type="button"
                            onClick={() => setExpanded(true)}
                            title={expandHint}
                            aria-label={expandHint}
                            className="absolute right-3 top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.3)] hover:bg-gray-50"
                        >
                            <Maximize2 className="size-5 text-(--brand)" />
                        </button>
                    )}

                    {/* Rendered in place (not portaled) so it stays inside any
                        parent modal/drawer — Radix's modal lock would otherwise
                        make a body-level portal unclickable. `fixed inset-0`
                        still covers the whole viewport. */}
                    {expanded && (
                        <FullscreenPicker
                            {...props}
                            addressText={addressText}
                            searchPlaceholder={searchPlaceholder}
                            searchNoResultsText={searchNoResultsText}
                            currentLocationText={currentLocationText}
                            confirmText={confirmText}
                            onClose={() => setExpanded(false)}
                        />
                    )}
                </>
            )}
        </div>
    );
}

/**
 * The actual Google map plus its on-map controls (search, layers toggle,
 * current location). Rendered both inline and inside the full-screen picker.
 * Assumes the Maps JS API is already loaded.
 */
function MapSurface({
    latitude,
    longitude,
    onChange,
    zoom = 15,
    searchPlaceholder = 'Search for a place or address',
    searchNoResultsText = 'No places found. Try a street, market, or area name.',
    showCurrentLocation = true,
    reverseOnPick = true,
    autoLocate = false,
    currentLocationText = 'Use my current location',
}: MapPickerProps) {
    const [locating, setLocating] = React.useState(false);
    const [mapType, setMapType] = React.useState<'roadmap' | 'hybrid'>(
        'roadmap',
    );

    // Initial viewport center — captured once so dropping pins doesn't recenter.
    const [center] = React.useState(() => ({
        lat: latitude != null ? latitude : DEFAULT_CENTER.lat,
        lng: longitude != null ? longitude : DEFAULT_CENTER.lng,
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
        lat: latitude != null ? latitude : center.lat,
        lng: longitude != null ? longitude : center.lng,
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
        if (autoLocate && !autoTriedRef.current) {
            autoTriedRef.current = true;
            handleCurrentLocation();
        }
    }, [autoLocate, handleCurrentLocation]);

    const handleSearchSelect = React.useCallback(
        (result: GeocodeResult) => {
            onChange(result.lat, result.lng, result.address, result.city);
            mapRef.current?.panTo({ lat: result.lat, lng: result.lng });
            mapRef.current?.setZoom(16);
        },
        [onChange],
    );

    return (
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
    );
}

/**
 * Full-screen location picker. Fills the viewport so searching and pinning are
 * easy on a phone; edits the same location live and closes on confirm.
 */
function FullscreenPicker({
    onClose,
    confirmText = 'Confirm this location',
    addressText,
    searchPlaceholder,
    ...rest
}: MapPickerProps & { onClose: () => void }) {
    // Mirror the latest resolved address so the confirm bar updates as the user
    // searches / drops a pin, without forcing the parent to round-trip.
    const [resolved, setResolved] = React.useState<string | undefined>(
        addressText,
    );

    const handleChange = React.useCallback(
        (lat: number, lng: number, address?: string, city?: string) => {
            if (address) setResolved(address);
            rest.onChange(lat, lng, address, city);
        },
        [rest],
    );

    return (
        <div className="fixed inset-0 z-70 flex flex-col bg-white dark:bg-zinc-950">
            {/* Header */}
            <div className="flex shrink-0 items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex size-9 items-center justify-center rounded-full text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Close"
                >
                    <X className="size-5" />
                </button>
                <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {searchPlaceholder ?? 'Choose location'}
                </p>
            </div>

            {/* Map fills the space */}
            <div className="relative min-h-0 flex-1">
                <MapSurface
                    {...rest}
                    searchPlaceholder={searchPlaceholder}
                    onChange={handleChange}
                />
            </div>

            {/* Confirm bar */}
            <div className="shrink-0 space-y-3 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                    <span className="min-w-0">
                        {resolved?.trim() || searchPlaceholder}
                    </span>
                </p>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25"
                >
                    <Check className="size-4" />
                    {confirmText}
                </button>
            </div>
        </div>
    );
}

/** Place search box overlaid on the top-left of the map. */
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
            className="absolute left-3 right-16 top-3 z-10 max-w-md"
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
