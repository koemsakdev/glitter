'use client';

import {
    Eye,
    ImageUp,
    Loader2,
    RefreshCw,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

interface BannerImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    minWidth?: number;
    recommendedAspect?: number;
}

export function BannerImageUploader({
    value,
    onChange,
    minWidth = 1000,
    recommendedAspect = 3,
}: BannerImageUploaderProps) {
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [warn, setWarn] = useState<string | null>(null);
    const [lightbox, setLightbox] = useState(false);
    const [zoom, setZoom] = useState(1);

    const preview = getFileUrl(value);

    async function uploadFile(file: File | undefined) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Please drop an image file', variant: 'destructive' });
            return;
        }
        setUploading(true);
        setWarn(null);
        try {
            const res = await uploadImage(file, minWidth);
            onChange(res.url);
            const aspect = res.width / Math.max(1, res.height);
            if (Math.abs(aspect - recommendedAspect) > 1) {
                setWarn(
                    `Tip: a wide image (~${recommendedAspect}:1) looks best. Yours is ${res.width}×${res.height}.`,
                );
            }
        } catch (error) {
            toast({
                title: 'Upload failed',
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    }

    function openPicker() {
        fileRef.current?.click();
    }
    function openLightbox() {
        setZoom(1);
        setLightbox(true);
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">Banner image</label>

            <div
                onClick={!preview && !uploading ? openPicker : undefined}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    void uploadFile(e.dataTransfer.files?.[0]);
                }}
                style={
                    !preview
                        ? {
                              backgroundImage:
                                  'radial-gradient(rgba(140,140,140,0.28) 1.5px, transparent 1.5px)',
                              backgroundSize: '18px 18px',
                          }
                        : undefined
                }
                className={`group relative h-75 w-full overflow-hidden rounded-xl border transition-colors ${
                    dragging
                        ? 'border-pink-500/50 border-dashed bg-pink-50/60 dark:bg-pink-500/10'
                        : 'border-2 border-dashed bg-muted/30 hover:border-pink-300/50 dark:hover:border-pink-700/50'
                } ${!preview && !uploading ? 'cursor-pointer' : ''}`}
            >
                {preview ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Banner"
                            className="size-full object-cover"
                        />
                        {/* Hover overlay — icon-only actions */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                            <IconButton label="View" onClick={openLightbox}>
                                <Eye className="size-4" />
                            </IconButton>
                            <IconButton label="Replace" onClick={openPicker}>
                                <RefreshCw className="size-4" />
                            </IconButton>
                            <IconButton
                                label="Delete"
                                danger
                                onClick={() => onChange('')}
                            >
                                <Trash2 className="size-4" />
                            </IconButton>
                        </div>
                    </>
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        {uploading ? (
                            <Loader2 className="size-8 animate-spin" />
                        ) : (
                            <>
                                <span className="flex size-12 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-500/15 dark:text-pink-300">
                                    <ImageUp className="size-6" />
                                </span>
                                <span className="text-sm font-medium text-foreground">
                                    Drop an image here
                                </span>
                                <span className="text-xs">
                                    or click to upload
                                </span>
                            </>
                        )}
                    </div>
                )}

                {uploading && preview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="size-6 animate-spin text-white" />
                    </div>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void uploadFile(file);
                }}
            />

            <p className="text-xs text-muted-foreground">
                Wide image, at least {minWidth}px (≈{recommendedAspect}:1).
            </p>
            {warn && <p className="text-xs text-amber-600">{warn}</p>}

            {/* Lightbox with zoom */}
            {lightbox && preview && (
                <div
                    className="fixed inset-0 z-100 flex flex-col bg-black/85"
                    onClick={() => setLightbox(false)}
                >
                    <div
                        className="flex items-center justify-end gap-2 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <LightboxButton
                            label="Zoom out"
                            onClick={() =>
                                setZoom((z) => Math.max(0.5, z - 0.25))
                            }
                        >
                            <ZoomOut className="size-5" />
                        </LightboxButton>
                        <span className="min-w-12 text-center text-sm font-medium text-white">
                            {Math.round(zoom * 100)}%
                        </span>
                        <LightboxButton
                            label="Zoom in"
                            onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                        >
                            <ZoomIn className="size-5" />
                        </LightboxButton>
                        <LightboxButton
                            label="Close"
                            onClick={() => setLightbox(false)}
                        >
                            <X className="size-5" />
                        </LightboxButton>
                    </div>
                    <div className="flex flex-1 items-center justify-center overflow-auto p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt="Banner"
                            onClick={(e) => e.stopPropagation()}
                            style={{ transform: `scale(${zoom})` }}
                            className="max-h-full max-w-full origin-center rounded-lg object-contain transition-transform"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function IconButton({
    label,
    onClick,
    danger,
    children,
}: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className={`flex size-9 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow transition-colors hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800 ${
                danger
                    ? 'hover:text-red-600 dark:hover:text-red-400'
                    : ''
            }`}
        >
            {children}
        </button>
    );
}

function LightboxButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            onClick={onClick}
            className="flex size-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
        >
            {children}
        </button>
    );
}
