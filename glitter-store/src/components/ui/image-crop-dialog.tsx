'use client';

import { Loader2, Minus, Plus, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { cropToFile } from '@/lib/crop-image';
import { useLang } from '@/lib/lang-context';
import { tr } from '@/lib/locale';

/**
 * Crop step shown right after a photo is picked (profile picture): drag to
 * move, slider / pinch to zoom, rotate. Only the cropped result is used.
 */
export function ImageCropDialog({
    file,
    aspect = 1,
    shape = 'rect',
    maxSize = 512,
    onCancel,
    onDone,
}: {
    file: File | null;
    aspect?: number;
    shape?: 'rect' | 'round';
    maxSize?: number;
    onCancel: () => void;
    onDone: (cropped: File) => void;
}) {
    const { lang } = useLang();
    const src = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
    useEffect(() => {
        return () => {
            if (src) URL.revokeObjectURL(src);
        };
    }, [src]);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [area, setArea] = useState<Area | null>(null);
    // Zoom at which the WHOLE image fits inside the frame (can be < 1).
    const [fitZoom, setFitZoom] = useState(1);
    const [busy, setBusy] = useState(false);

    // Fresh state for each new photo.
    const [forFile, setForFile] = useState<File | null>(null);
    if (file !== forFile) {
        setForFile(file);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setArea(null);
        setFitZoom(1);
    }

    async function apply() {
        if (!file || !area) return;
        setBusy(true);
        try {
            const base = rotation ? await rotated(src, rotation) : src;
            onDone(
                await cropToFile(base, area, {
                    name: file.name,
                    type: 'image/webp',
                    maxSize,
                }),
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <ResponsiveModal
            open={Boolean(file)}
            onOpenChange={(o) => !o && !busy && onCancel()}
            title={tr(lang, 'cropTitle')}
            centered
            className="sm:max-w-md"
        >
            <div className="p-5">
                <h2 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {tr(lang, 'cropTitle')}
                </h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'cropHint')}
                </p>

                <div className="relative mt-4 h-[min(55vh,320px)] overflow-hidden rounded-2xl bg-zinc-900">
                    {src && (
                        <Cropper
                            image={src}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={aspect}
                            cropShape={shape}
                            showGrid={shape === 'rect'}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onCropComplete={(_, px) => setArea(px)}
                            objectFit="contain"
                            // Allow zooming out past the edges so the whole
                            // picture can be kept (empty space stays clear).
                            minZoom={0.2}
                            restrictPosition={false}
                            onMediaLoaded={({ width, height }) => {
                                const fit =
                                    Math.min(width, height) /
                                    Math.max(width, height);
                                setFitZoom(fit);
                            }}
                        />
                    )}
                </div>

                <div className="mt-4 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
                        aria-label="-"
                        className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Minus className="size-4" />
                    </button>
                    <input
                        type="range"
                        min={0.2}
                        max={4}
                        step={0.01}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        aria-label="zoom"
                        className="h-1.5 flex-1 cursor-pointer accent-(--brand)"
                    />
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
                        aria-label="+"
                        className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <Plus className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setZoom(fitZoom);
                            setCrop({ x: 0, y: 0 });
                        }}
                        className="rounded-full px-2.5 py-1 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                    >
                        {tr(lang, 'cropFit')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        aria-label={tr(lang, 'cropRotate')}
                        className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <RotateCw className="size-4" />
                    </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-full border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        {tr(lang, 'cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={() => void apply()}
                        disabled={busy || !area}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-(--brand) py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                    >
                        {busy && <Loader2 className="size-4 animate-spin" />}
                        {tr(lang, 'cropApply')}
                    </button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

/** Rotate an image by 90° steps and return a data URL. */
async function rotated(src: string, deg: number): Promise<string> {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = src;
    });
    const swap = deg % 180 !== 0;
    const c = document.createElement('canvas');
    c.width = swap ? img.height : img.width;
    c.height = swap ? img.width : img.height;
    const ctx = c.getContext('2d');
    if (!ctx) return src;
    ctx.translate(c.width / 2, c.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    return c.toDataURL('image/png');
}
