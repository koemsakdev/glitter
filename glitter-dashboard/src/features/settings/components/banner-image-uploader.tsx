'use client';

import { Eye, ImageUp, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

interface BannerImageUploaderProps {
    /** Already-saved image url (for edit). */
    value: string;
    /** Locally selected file, not yet uploaded. */
    file: File | null;
    /** User picked a file (or null when removed). Upload happens on Save. */
    onPick: (file: File | null) => void;
    minWidth?: number;
    recommendedAspect?: number;
    /** Override the default "Banner image" label. */
    label?: string;
    /** Override the size hint line. */
    hint?: string;
    /** Size classes for the drop zone (default: full-width tall banner box). */
    boxClass?: string;
    /** How the preview image fills the box. Logos look better "contain". */
    imageFit?: 'cover' | 'contain';
}

export function BannerImageUploader({
    value,
    file,
    onPick,
    minWidth = 1000,
    recommendedAspect = 3,
    label,
    hint,
    boxClass = 'h-75 w-full',
    imageFit = 'cover',
}: BannerImageUploaderProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    // Local preview for the pending file; revoke the object URL when it changes.
    const objectUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );
    useEffect(() => {
        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [objectUrl]);

    const preview = objectUrl ?? getFileUrl(value);

    function pick(f: File | undefined) {
        if (!f) return;
        if (!f.type.startsWith('image/')) {
            toast({
                title: t('settings.banner.dropImage'),
                variant: 'destructive',
            });
            return;
        }
        onPick(f);
    }

    function openPicker() {
        fileRef.current?.click();
    }

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">
                {label ?? t('settings.banner.imageLabel')}
            </label>

            <div
                onClick={!preview ? openPicker : undefined}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pick(e.dataTransfer.files?.[0]);
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
                className={`group relative ${boxClass} overflow-hidden rounded-xl border transition-colors ${
                    dragging
                        ? 'border-pink-500/50 border-dashed bg-pink-50/60 dark:bg-pink-500/10'
                        : 'border-2 border-dashed bg-muted/30 hover:border-pink-300/50 dark:hover:border-pink-700/50'
                } ${!preview ? 'cursor-pointer' : ''}`}
            >
                {preview ? (
                    <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={preview}
                            alt={label ?? t('settings.banner.alt')}
                            className={`size-full ${
                                imageFit === 'contain'
                                    ? 'object-contain p-3'
                                    : 'object-cover'
                            }`}
                        />
                        {/* Hover overlay — icon-only actions */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                            <IconButton
                                label={t('settings.banner.view')}
                                onClick={() => setLightboxOpen(true)}
                            >
                                <Eye className="size-4" />
                            </IconButton>
                            <IconButton
                                label={t('settings.banner.replace')}
                                onClick={openPicker}
                            >
                                <RefreshCw className="size-4" />
                            </IconButton>
                            <IconButton
                                label={t('common.delete')}
                                danger
                                onClick={() => onPick(null)}
                            >
                                <Trash2 className="size-4" />
                            </IconButton>
                        </div>
                    </>
                ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <span className="flex size-12 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-500/15 dark:text-pink-300">
                            <ImageUp className="size-6" />
                        </span>
                        <span className="text-sm font-medium text-foreground">
                            {t('settings.banner.dropHere')}
                        </span>
                        <span className="text-xs">
                            {t('settings.banner.clickUpload')}
                        </span>
                    </div>
                )}
            </div>

            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    pick(f);
                }}
            />

            <p className="text-xs text-muted-foreground">
                {hint ??
                    t('settings.banner.sizeHint')
                        .replace('{min}', String(minWidth))
                        .replace('{aspect}', String(recommendedAspect))}
            </p>

            <ImageLightbox
                images={
                    preview
                        ? [{ src: preview, alt: label ?? t('settings.banner.alt') }]
                        : []
                }
                initialIndex={lightboxOpen && preview ? 0 : null}
                onClose={() => setLightboxOpen(false)}
            />
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
                danger ? 'hover:text-red-600 dark:hover:text-red-400' : ''
            }`}
        >
            {children}
        </button>
    );
}
