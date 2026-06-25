'use client';

import { useQuery } from '@tanstack/react-query';
import {
    Check,
    Eye,
    ImageUp,
    Library,
    Link2,
    Loader2,
    RefreshCw,
    Trash2,
    Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Input } from '@/components/ui/input';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { listUploadedImages, uploadImage } from '@/lib/uploads';

type Mode = 'upload' | 'url' | 'library';

const MODES: { value: Mode; key: TranslationKey; icon: typeof Upload }[] = [
    { value: 'upload', key: 'ad.image.upload', icon: Upload },
    { value: 'url', key: 'ad.image.url', icon: Link2 },
    { value: 'library', key: 'ad.image.library', icon: Library },
];

export function AdImageField({
    value,
    onChange,
}: {
    value: string;
    onChange: (url: string) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const fileRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<Mode>('upload');
    const [uploading, setUploading] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const library = useQuery({
        queryKey: ['uploaded-images'],
        queryFn: listUploadedImages,
        enabled: mode === 'library',
    });

    const preview = getFileUrl(value);

    function openPicker() {
        fileRef.current?.click();
    }

    async function handleFile(file: File | undefined) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({
                title: t('settings.banner.dropImage'),
                variant: 'destructive',
            });
            return;
        }
        setUploading(true);
        try {
            const result = await uploadImage(file, 0);
            onChange(result.url);
        } catch (error) {
            toast({
                title: t('ad.image.uploadFailed'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="space-y-2">
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    void handleFile(f);
                }}
            />

            <label className="text-sm font-medium">{t('ad.image')}</label>

            {/* Mode switch */}
            <div className="flex gap-1 rounded-lg border border-input bg-muted/40 p-1 dark:bg-input/20">
                {MODES.map((m) => {
                    const Icon = m.icon;
                    return (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => setMode(m.value)}
                            className={cn(
                                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all',
                                mode === m.value
                                    ? 'bg-pink-500 text-white shadow-sm dark:bg-pink-600'
                                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                            )}
                        >
                            <Icon className="size-3.5" />
                            {t(m.key)}
                        </button>
                    );
                })}
            </div>

            {/* UPLOAD — box with image preview + view/replace/delete */}
            {mode === 'upload' && (
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
                        void handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                        'group relative h-44 w-full overflow-hidden rounded-xl border-2 border-dashed transition-colors',
                        dragging
                            ? 'border-pink-500/50 bg-pink-50/60 dark:bg-pink-500/10'
                            : 'bg-muted/30 hover:border-pink-300/50 dark:hover:border-pink-700/50',
                        !preview && !uploading && 'cursor-pointer',
                    )}
                >
                    {uploading ? (
                        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="size-6 animate-spin text-pink-500" />
                            <span className="text-xs">
                                {t('ad.image.uploading')}
                            </span>
                        </div>
                    ) : preview ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt=""
                                className="size-full object-cover"
                            />
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
                                    onClick={() => onChange('')}
                                >
                                    <Trash2 className="size-4" />
                                </IconButton>
                            </div>
                        </>
                    ) : (
                        <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <span className="flex size-11 items-center justify-center rounded-full bg-pink-100 text-pink-500 dark:bg-pink-500/15 dark:text-pink-300">
                                <ImageUp className="size-5" />
                            </span>
                            <span className="text-sm font-medium text-foreground">
                                {t('settings.banner.clickUpload')}
                            </span>
                            <span className="text-[11px]">
                                {t('ad.image.formats')}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* URL — only the input (with a small preview if it resolves) */}
            {mode === 'url' && (
                <div className="space-y-2">
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="https://… or /upload/uploads/…"
                    />
                    {preview && (
                        <div className="h-28 w-full overflow-hidden rounded-lg border bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={preview}
                                alt=""
                                className="size-full object-cover"
                            />
                        </div>
                    )}
                </div>
            )}

            {/* LIBRARY — only the gallery to choose from */}
            {mode === 'library' && (
                <div className="max-h-60 overflow-y-auto rounded-xl border p-2">
                    {library.isLoading ? (
                        <div className="flex justify-center py-6">
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : (library.data ?? []).length === 0 ? (
                        <p className="py-6 text-center text-xs text-muted-foreground">
                            {t('ad.image.libraryEmpty')}
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {(library.data ?? []).map((img) => {
                                const selected = img.url === value;
                                return (
                                    <button
                                        key={img.url}
                                        type="button"
                                        onClick={() => onChange(img.url)}
                                        className={cn(
                                            'relative aspect-square overflow-hidden rounded-lg border-2 transition-colors',
                                            selected
                                                ? 'border-pink-500'
                                                : 'border-transparent hover:border-pink-300',
                                        )}
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={getFileUrl(img.url) ?? ''}
                                            alt={img.name}
                                            className="size-full object-cover"
                                        />
                                        {selected && (
                                            <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-pink-500 text-white">
                                                <Check className="size-3" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <ImageLightbox
                images={preview ? [{ src: preview, alt: '' }] : []}
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
            className={cn(
                'flex size-9 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow transition-colors hover:bg-white dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:bg-zinc-800',
                danger && 'hover:text-red-600 dark:hover:text-red-400',
            )}
        >
            {children}
        </button>
    );
}
