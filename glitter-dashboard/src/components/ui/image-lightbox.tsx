'use client';

import {
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minus,
    Plus,
    Star,
    X,
} from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { createPortal } from 'react-dom';

export interface LightboxImage {
    src: string;
    alt: string;
    isPrimary?: boolean;
}

interface ImageLightboxProps {
    images: LightboxImage[];
    /** Index of the initially shown image. Setting to null closes the lightbox. */
    initialIndex: number | null;
    onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export function ImageLightbox({
                                  images,
                                  initialIndex,
                                  onClose,
                              }: ImageLightboxProps) {
    const isOpen = initialIndex !== null;
    const [currentIndex, setCurrentIndex] = React.useState(initialIndex ?? 0);
    const [zoom, setZoom] = React.useState(1);
    const [pan, setPan] = React.useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = React.useState(false);
    const dragStart = React.useRef({ x: 0, y: 0, panX: 0, panY: 0 });
    const [isMounted, setIsMounted] = React.useState(false);

    // Reset when opening or navigating
    React.useEffect(() => {
        if (initialIndex !== null) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex]);

    // Reset zoom/pan when changing image
    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, [currentIndex]);

    // Mount + fade in
    React.useEffect(() => {
        if (isOpen) {
            // Tiny delay so the opening transition runs
            const t = setTimeout(() => setIsMounted(true), 10);
            return () => clearTimeout(t);
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMounted(false);
        return undefined;
    }, [isOpen]);

    // Lock body scroll while open
    React.useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [isOpen]);

    const hasMultiple = images.length > 1;
    const canPrev = hasMultiple;
    const canNext = hasMultiple;

    const goPrev = React.useCallback(() => {
        if (!canPrev) return;
        setCurrentIndex((i) => (i - 1 + images.length) % images.length);
    }, [canPrev, images.length]);

    const goNext = React.useCallback(() => {
        if (!canNext) return;
        setCurrentIndex((i) => (i + 1) % images.length);
    }, [canNext, images.length]);

    const zoomIn = React.useCallback(() => {
        setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    }, []);
    const zoomOut = React.useCallback(() => {
        setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    }, []);
    const resetZoom = React.useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    // Keyboard
    React.useEffect(() => {
        if (!isOpen) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goPrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goNext();
            } else if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            }
        }
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, goPrev, goNext, zoomIn, zoomOut, resetZoom, onClose]);

    // Mouse wheel zoom
    function handleWheel(e: React.WheelEvent) {
        e.preventDefault();
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    }

    // Pan when zoomed
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

    // Double-click to toggle zoom
    function handleDoubleClick() {
        if (zoom === 1) {
            setZoom(2);
        } else {
            resetZoom();
        }
    }

    if (!isOpen) return null;

    const currentImage = images[currentIndex];
    if (!currentImage) return null;
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
            onClick={(e) => {
                // Close on backdrop click (but not when dragging)
                if (e.target === e.currentTarget && !isDragging) {
                    onClose();
                }
            }}
            className={`fixed inset-0 z-100 flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-200 ${
                isMounted ? 'opacity-100' : 'opacity-0'
            }`}
        >
            {/* Top bar — counter + close */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
                <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md">
                    {currentImage.isPrimary && (
                        <Star className="size-3.5 fill-pink-400 text-pink-400" />
                    )}
                    <span>
            {currentIndex + 1} / {images.length}
          </span>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="pointer-events-auto flex size-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                    aria-label="Close (Esc)"
                    title="Close (Esc)"
                >
                    <X className="size-5" />
                </button>
            </div>

            {/* Image */}
            <div
                className={`relative flex h-full w-full items-center justify-center overflow-hidden ${
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
                    <Image
                        src={currentImage.src}
                        alt={currentImage.alt}
                        width={1600}
                        height={1600}
                        className="max-h-[85vh] max-w-[90vw] select-none object-contain"
                        unoptimized
                        draggable={false}
                        priority
                    />
                </div>
            </div>

            {/* Prev / next arrows */}
            {hasMultiple && (
                <>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            goPrev();
                        }}
                        className="absolute left-4 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                        aria-label="Previous image (←)"
                        title="Previous (←)"
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
                        aria-label="Next image (→)"
                        title="Next (→)"
                    >
                        <ChevronRight className="size-6" />
                    </button>
                </>
            )}

            {/* Bottom toolbar — zoom controls */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center p-4">
                <div className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1.5 text-white backdrop-blur-md">
                    <button
                        type="button"
                        onClick={zoomOut}
                        disabled={zoom <= MIN_ZOOM}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom out (-)"
                        title="Zoom out (-)"
                    >
                        <Minus className="size-4" />
                    </button>

                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex h-8 min-w-15 items-center justify-center rounded-full px-3 text-xs font-medium tabular-nums transition-colors hover:bg-white/15"
                        aria-label="Reset zoom (0)"
                        title="Reset zoom (0)"
                    >
                        {Math.round(zoom * 100)}%
                    </button>

                    <button
                        type="button"
                        onClick={zoomIn}
                        disabled={zoom >= MAX_ZOOM}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Zoom in (+)"
                        title="Zoom in (+)"
                    >
                        <Plus className="size-4" />
                    </button>

                    <div className="mx-1 h-5 w-px bg-white/20" />

                    <button
                        type="button"
                        onClick={resetZoom}
                        className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/15"
                        aria-label="Fit to screen"
                        title="Fit to screen"
                    >
                        <Maximize2 className="size-4" />
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}