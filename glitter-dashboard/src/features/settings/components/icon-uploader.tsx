'use client';

import { ImageUp, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';

/**
 * Compact square icon picker — a small thumbnail + Upload/Remove buttons.
 * Lighter than the banner uploader, sized for small logos/icons. Upload is
 * deferred: it just reports the picked `File` (or null) and the parent uploads
 * on save, matching `BannerImageUploader`'s contract.
 */
export function IconUploader({
    value,
    file,
    onPick,
    label,
    hint,
}: {
    value: string;
    file: File | null;
    onPick: (file: File | null) => void;
    label?: string;
    hint?: string;
}) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);

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

    return (
        <div className="space-y-2">
            {label && <label className="text-sm font-medium">{label}</label>}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed bg-muted/30 transition-colors hover:border-pink-300/60 dark:hover:border-pink-700/60"
                >
                    {preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={preview}
                            alt=""
                            className="size-full object-contain p-1.5"
                        />
                    ) : (
                        <ImageUp className="size-5 text-muted-foreground" />
                    )}
                </button>
                <div className="min-w-0 space-y-1.5">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                        >
                            {preview
                                ? t('settings.banner.replace')
                                : t('settings.delivery.upload')}
                        </button>
                        {preview && (
                            <button
                                type="button"
                                onClick={() => onPick(null)}
                                aria-label={t('common.delete')}
                                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs text-muted-foreground hover:text-destructive"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>
                    {hint && (
                        <p className="text-xs text-muted-foreground">{hint}</p>
                    )}
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) onPick(f);
                }}
            />
        </div>
    );
}
