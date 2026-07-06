'use client';

import {
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minus,
    Plus,
    X,
} from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

/**
 * Full-screen image viewer (zoom + pan + keyboard) — a storefront port of the
 * dashboard lightbox. Setting `initialIndex` to null closes it.
 */
export function ImageLightbox({
    images,
    initialIndex,
    onClose,
}: {
    images: { src: string; alt: string }[];
    initialIndex: number | null;
    onClose: () => void;
}) {
    const isOpen = initialIndex !== null;
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex ?? 0);
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStart = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        if (initialIndex !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex]);

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [currentIndex]);

    React.useEffect(() => {
        if (isOpen) {
            const t = setTimeout(() => setIsMounted(true), 10);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(false);
        return undefined;
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    const hasMultiple = images.length > 1;

    const goPrev = React.useCallback(() => {
        if (!hasMultiple) return;
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }, [hasMultiple, images.length]);

    const goNext = React.useCallback(() => {
        if (!hasMultiple) return;
        setCurrentIndex((i) => (i + 1) % images.length);
    }, [hasMultiple, images.length]);

    const zoomIn = React.useCallback(
        () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP)),
        [],
    );
    const zoomOut = React.useCallback(
        () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP)),
        [],
    );
    const resetZoom = React.useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    React.useEffect(() => {
        if (!isOpen) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === 'ArrowRight') goNext();
            else if (e.key === '+' || e.key === '=') zoomIn();
            else if (e.key === '-' || e.key === '_') zoomOut();
            else if (e.key === '0') resetZoom();
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, goPrev, goNext, zoomIn, zoomOut, resetZoom, onClose]);

    function handleWheel(e: React.WheelEvent) {
        if (e.deltaY < 0) zoomIn();
        else zoomOut();
    }
    function handleMouseDown(e: React.MouseEvent) {
        if (zoom <= 1) return;
        setIsDragging(true);
        dragStart.current = {
            x: e.clientX,
            y: e.clientY,
            panX: pan.x,
            panY: pan.y,
        };
    }
    function handleMouseMove(e: React.MouseEvent) {
        if (!isDragging) return;
        setPan({
            x: dragStart.current.panX + (e.clientX - dragStart.current.x),
            y: dragStart.current.panY + (e.clientY - dragStart.current.y),
        });
    }
    function handleMouseUp() {
        setIsDragging(false);
    }
    function handleDoubleClick() {
        if (zoom === 1) setZoom(2);
        else resetZoom();
    }

    if (!isOpen) return null;
    const current = images[currentIndex];
    if (!current || typeof document === 'undefined') return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isDragging) onClose();
            }}
            className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-200 ${
                isMounted ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
                <div className="pointer-events-auto rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
                    {currentIndex + 1} / {images.length}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                    aria-label="Close"
                >
                    <X className="size-5" />
                </button>
            </div>

            <div
                className={`flex h-full w-full items-center justify-center overflow-hidden ${
                    zoom > 1
                        ? isDragging
                            ? 'cursor-grabbing'
                            : 'cursor-grab'
                        : 'cursor-zoom-in'
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={handleDoubleClick}
            >
                <div
                    style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transition: isDragging
                            ? 'none'
                            : 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className="relative max-h-[85vh] max-w-[90vw]"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={current.src}
                        alt={current.alt}
                        className="max-h-[85vh] max-w-[90vw] select-none object-contain"
                        draggable={false}
                    />
                </div>
            </div>

            {hasMultiple && (
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            goPrev();
                        }}
                        className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                        aria-label="Previous image"
                    >
                        <ChevronLeft className="size-6" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            goNext();
                        }}
                        className="absolute right-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                        aria-label="Next image"
                    >
                        <ChevronRight className="size-6" />
                    </button>
                </>
            )}

            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
                <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 text-white backdrop-blur-md">
                    <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoom <= MIN_ZOOM}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom out"
                    >
                        <Minus className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex h-8 min-w-15 items-center justify-center rounded-full px-3 text-xs font-medium tabular-nums transition-colors hover:bg-white/15"
                        aria-label="Reset zoom"
                    >
                        {Math.round(zoom * 100)}%
                    </button>
                    <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoom >= MAX_ZOOM}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom in"
                    >
                        <Plus className="size-4" />
                    </button>
                    <div className="mx-1 h-5 w-px bg-white/20" />
                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                        aria-label="Fit to screen"
                    >
                        <Maximize2 className="size-4" />
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
