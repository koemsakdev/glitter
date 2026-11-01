'use client';

import { ImageUp } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';

/**
 * Logo / icon picker used by the checkout settings forms (payment options,
 * delivery options, shipping regions): a tappable tile showing the image
 * edge to edge, with Upload / Replace and Delete next to it.
 */
export function LogoPicker({
    value,
    file,
    onPick,
    label,
    hint,
}: {
    /** Saved image path/URL ('' = none). */
    value: string;
    /** Newly picked file (previewed before it's uploaded on save). */
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
    const src = objectUrl ?? getFileUrl(value);

    return (
        <div className="space-y-2">
            {label && <p className="text-sm font-medium">{label}</p>}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    aria-label={t('settings.delivery.upload')}
                    className="group relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted ring-1 ring-border transition hover:ring-pink-300 dark:hover:ring-pink-700"
                >
                    {src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={src}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <ImageUp className="size-5 text-muted-foreground" />
                    )}
                    {src && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                            <ImageUp className="size-4 text-white" />
                        </span>
                    )}
                </button>
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <button
                            type="button"
                            onClick={() => inputRef.current?.click()}
                            className="font-medium text-pink-600 hover:underline dark:text-pink-400"
                        >
                            {src
                                ? t('settings.banner.replace')
                                : t('settings.delivery.upload')}
                        </button>
                        {src && (
                            <button
                                type="button"
                                onClick={() => onPick(null)}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                {t('common.delete')}
                            </button>
                        )}
                    </div>
                    {hint && (
                        <p className="text-xs leading-snug text-muted-foreground">
                            {hint}
                        </p>
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
