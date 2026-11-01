'use client';

import { Loader2, Minus, Plus, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { cropToFile } from '@/lib/crop-image';
import { useI18n } from '@/lib/i18n';

/**
 * Crop step shown right after an image is picked (logos, KHQR, profile
 * photos): drag to move, slider / pinch / wheel to zoom. Only the cropped
 * result is passed on (and later uploaded).
 */
export function ImageCropDialog({
    file,
    aspect = 1,
    shape = 'rect',
    output = 'image/webp',
    maxSize = 1024,
    title,
    onCancel,
    onDone,
}: {
    /** The picked image; the dialog is open while this is set. */
    file: File | null;
    aspect?: number;
    shape?: 'rect' | 'round';
    /** PNG keeps QR codes perfectly sharp. */
    output?: 'image/webp' | 'image/png' | 'image/jpeg';
    maxSize?: number;
    title?: string;
    onCancel: () => void;
    onDone: (cropped: File) => void;
}) {
    const { t } = useI18n();
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

    // Fresh state for each new image.
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
            const out = await cropToFile(
                rotation ? await rotated(src, rotation) : src,
                area,
                { name: file.name, type: output, maxSize },
            );
            onDone(out);
        } finally {
            setBusy(false);
        }
    }

    return (
        <ResponsiveModal
            open={Boolean(file)}
            onOpenChange={(o) => !o && !busy && onCancel()}
            className="sm:max-w-lg"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-3 pt-6">
                    <h2 className="text-lg font-bold tracking-tight">
                        {title ?? t('crop.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t('crop.hint')}
                    </p>
                </div>

                <div className="relative mx-6 h-[min(60vh,360px)] overflow-hidden rounded-xl bg-zinc-900">
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

                <div className="flex items-center gap-3 px-6 pt-4">
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
                        aria-label={t('crop.zoomOut')}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        aria-label={t('crop.zoom')}
                        className="h-1.5 flex-1 cursor-pointer accent-pink-500"
                    />
                    <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
                        aria-label={t('crop.zoomIn')}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <Plus className="size-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setZoom(fitZoom);
                            setCrop({ x: 0, y: 0 });
                        }}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground"
                    >
                        {t('crop.fit')}
                    </button>
                    <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        aria-label={t('crop.rotate')}
                        title={t('crop.rotate')}
                        className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <RotateCw className="size-4" />
                    </button>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={onCancel}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void apply()}
                        disabled={busy || !area}
                        className="min-w-28 bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {busy && <Loader2 className="size-4 animate-spin" />}
                        {t('crop.apply')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

/** Rotate an image by 90° steps and return a new object URL. */
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
