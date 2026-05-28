'use client';

import { ImagePlus, Star, Trash2, Upload } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { ImageEditorState, ImageItem } from '@/types/product';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

interface ProductImageUploaderProps {
    state: ImageEditorState;
    onChange: (state: ImageEditorState) => void;
}

/**
 * Fully local image editor — never touches the server.
 * Parent commits the diff (uploads/deletes/primary) on form submit.
 * Supports drag-and-drop multi-select and click-to-browse.
 */
export function ProductImageUploader({
                                         state,
                                         onChange,
                                     }: ProductImageUploaderProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

    const totalCount = state.items.length;
    const canAddMore = totalCount < MAX_IMAGES;

    /** Validate and append files to local state. */
    function addFiles(fileList: FileList | File[]) {
        const files = Array.from(fileList);
        if (files.length === 0) return;

        const slotsLeft = MAX_IMAGES - totalCount;
        if (slotsLeft <= 0) {
            toast({
                title: t('common.toast.error'),
                description: t('product.image.tooMany').replace(
                    '{max}',
                    String(MAX_IMAGES),
                ),
                variant: 'destructive',
            });
            return;
        }

        const valid: File[] = [];
        for (const file of files) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.image.invalidType'),
                    variant: 'destructive',
                });
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.image.tooLarge').replace('{name}', file.name),
                    variant: 'destructive',
                });
                continue;
            }
            valid.push(file);
        }

        if (valid.length === 0) return;

        // Respect the remaining slots
        const accepted = valid.slice(0, slotsLeft);
        if (valid.length > slotsLeft) {
            toast({
                title: t('common.toast.error'),
                description: t('product.image.tooMany').replace(
                    '{max}',
                    String(MAX_IMAGES),
                ),
                variant: 'destructive',
            });
        }

        const hasPrimaryAlready = state.items.some((i) => i.isPrimary);
        const newItems: ImageItem[] = accepted.map((file, idx) => ({
            kind: 'new',
            id: `new-${Date.now()}-${idx}`,
            file,
            previewUrl: URL.createObjectURL(file),
            // First image overall becomes primary if none exists yet
            isPrimary: !hasPrimaryAlready && idx === 0,
        }));

        onChange({ ...state, items: [...state.items, ...newItems] });

        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleSetPrimary(itemId: string) {
        onChange({
            ...state,
            items: state.items.map((i) => ({ ...i, isPrimary: i.id === itemId })),
        });
    }

    function handleRemove(item: ImageItem) {
        const remaining = state.items.filter((i) => i.id !== item.id);

        // If we removed the primary, promote the first remaining
        if (item.isPrimary && remaining.length > 0 && !remaining.some((i) => i.isPrimary)) {
            remaining[0] = { ...remaining[0], isPrimary: true };
        }

        // Track deletion if it was an existing server image; revoke URL if new
        let deletedIds = state.deletedIds;
        if (item.kind === 'existing') {
            deletedIds = [...state.deletedIds, item.id];
        } else {
            URL.revokeObjectURL(item.previewUrl);
        }

        onChange({ items: remaining, deletedIds });
    }

    // Drag-and-drop handlers
    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        if (!isDragging) setIsDragging(true);
    }
    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
    }
    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            addFiles(e.dataTransfer.files);
        }
    }

    // Clean up object URLs on unmount
    React.useEffect(() => {
        return () => {
            state.items.forEach((i) => {
                if (i.kind === 'new') URL.revokeObjectURL(i.previewUrl);
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function srcFor(item: ImageItem): string {
        return item.kind === 'new'
            ? item.previewUrl
            : (getFileUrl(item.imageUrl) ?? '');
    }

    const primaryItem = state.items.find((i) => i.isPrimary) ?? state.items[0];

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(e) => e.target.files && addFiles(e.target.files)}
            />

            {/* Empty state — big drop zone */}
            {totalCount === 0 && (
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ')
                            fileInputRef.current?.click();
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
                        isDragging
                            ? 'border-pink-400 bg-pink-50/70 dark:border-pink-500 dark:bg-pink-500/10'
                            : 'border-border bg-muted/30 hover:border-pink-300 hover:bg-pink-50/50 dark:hover:border-pink-500/50 dark:hover:bg-pink-500/5'
                    }`}
                >
                    {isDragging ? (
                        <Upload className="size-8 text-pink-500" />
                    ) : (
                        <ImagePlus className="size-8 text-muted-foreground" />
                    )}
                    <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                            {isDragging
                                ? t('product.image.dropNow')
                                : t('product.image.dropzoneTitle')}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('product.image.dropzoneHelp')}
                        </p>
                    </div>
                </div>
            )}

            {/* Gallery */}
            {totalCount > 0 && (
                <div className="space-y-3">
                    {/* Primary preview */}
                    {primaryItem && (
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                            <Image
                                src={srcFor(primaryItem)}
                                alt="Primary"
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        </div>
                    )}

                    {/* Thumbnail grid + add tile (also a drop target) */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`grid grid-cols-4 gap-2 rounded-lg p-1 transition-colors ${
                            isDragging
                                ? 'bg-pink-50/70 ring-2 ring-pink-300 dark:bg-pink-500/10 dark:ring-pink-500/40'
                                : ''
                        }`}
                    >
                        {state.items.map((item) => (
                            <ImageThumbnail
                                key={item.id}
                                src={srcFor(item)}
                                isPrimary={item.isPrimary}
                                isNew={item.kind === 'new'}
                                onSetPrimary={() => handleSetPrimary(item.id)}
                                onRemove={() => handleRemove(item)}
                            />
                        ))}

                        {canAddMore && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-pink-300 hover:bg-pink-50/50 dark:hover:border-pink-500/50 dark:hover:bg-pink-500/5"
                            >
                                <ImagePlus className="size-5 text-muted-foreground" />
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {t('product.image.count')
                            .replace('{current}', String(totalCount))
                            .replace('{max}', String(MAX_IMAGES))}
                        {' · '}
                        {t('product.image.dragHint')}
                    </p>
                </div>
            )}
        </div>
    );
}

function ImageThumbnail({
                            src,
                            isPrimary,
                            isNew,
                            onSetPrimary,
                            onRemove,
                        }: {
    src: string;
    isPrimary: boolean;
    isNew: boolean;
    onSetPrimary: () => void;
    onRemove: () => void;
}) {
    return (
        <div
            className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted/30 ${
                isPrimary
                    ? 'border-pink-400 ring-2 ring-pink-200 dark:border-pink-500 dark:ring-pink-500/30'
                    : 'border-border/60'
            }`}
        >
            <Image src={src} alt="" fill className="object-cover" unoptimized />

            {isPrimary && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded-md bg-pink-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                    <Star className="size-2.5 fill-current" />
                </div>
            )}
            {isNew && (
                <div className="absolute right-1 top-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                    NEW
                </div>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                {!isPrimary && (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={onSetPrimary}
                        className="size-7 text-white hover:bg-white/20 hover:text-white"
                        title="Set as primary"
                    >
                        <Star className="size-4" />
                    </Button>
                )}
                <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={onRemove}
                    className="size-7 text-white hover:bg-red-500/80 hover:text-white"
                    title="Remove"
                >
                    <Trash2 className="size-4" />
                </Button>
            </div>
        </div>
    );
}