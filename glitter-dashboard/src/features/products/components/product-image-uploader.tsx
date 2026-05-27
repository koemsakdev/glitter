'use client';

import { ImagePlus, Loader2, Star, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { ProductImage } from '@/types/product';
import {
    useBulkUploadProductImages,
    useDeleteProductImage,
    useSetPrimaryProductImage,
} from '@/features/product-images/use-product-images';
import { getErrorMessage } from '@/lib/api-client';

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/**
 * A pending image is one selected by the user in CREATE mode
 * before the product is saved. It's kept only in local state.
 */
export interface PendingImage {
    id: string; // local UUID like "pending-{nanoseconds}"
    file: File;
    previewUrl: string; // object URL for preview
    isPrimary: boolean;
}

interface ProductImageUploaderProps {
    /** Product ID — undefined when creating a new product */
    productId?: string;
    /** Existing images from the server (edit mode) */
    serverImages?: ProductImage[];
    /** Pending images held locally (create mode) */
    pendingImages?: PendingImage[];
    /** Called when pending images change in create mode */
    onPendingChange?: (images: PendingImage[]) => void;
}

export function ProductImageUploader({
                                         productId,
                                         serverImages = [],
                                         pendingImages = [],
                                         onPendingChange,
                                     }: ProductImageUploaderProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const isCreateMode = !productId;

    const bulkUploadMutation = useBulkUploadProductImages();
    const setPrimaryMutation = useSetPrimaryProductImage();
    const deleteMutation = useDeleteProductImage();

    const totalCount = serverImages.length + pendingImages.length;
    const canAddMore = totalCount < MAX_IMAGES;
    const isMutating =
        bulkUploadMutation.isPending ||
        setPrimaryMutation.isPending ||
        deleteMutation.isPending;

    /**
     * Validate files and either upload immediately (edit mode)
     * or store as pending (create mode).
     */
    async function handleFiles(files: FileList | null) {
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);
        const slotsLeft = MAX_IMAGES - totalCount;
        if (fileArray.length > slotsLeft) {
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

        // Validate each file
        for (const file of fileArray) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.image.invalidType'),
                    variant: 'destructive',
                });
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.image.tooLarge').replace(
                        '{name}',
                        file.name,
                    ),
                    variant: 'destructive',
                });
                return;
            }
        }

        if (isCreateMode) {
            // Store locally — actual upload happens after product creation
            const newPending: PendingImage[] = fileArray.map((file, idx) => ({
                id: `pending-${Date.now()}-${idx}`,
                file,
                previewUrl: URL.createObjectURL(file),
                // First image of the very first batch becomes primary
                isPrimary: pendingImages.length === 0 && idx === 0,
            }));
            onPendingChange?.([...pendingImages, ...newPending]);
        } else {
            // Edit mode — upload immediately
            try {
                await bulkUploadMutation.mutateAsync({
                    productId: productId!,
                    files: fileArray,
                    imageType: 'gallery',
                });
                toast({
                    title: t('product.image.uploadSuccess'),
                    variant: 'success',
                });
            } catch (error) {
                toast({
                    title: t('common.toast.error'),
                    description: getErrorMessage(error),
                    variant: 'destructive',
                });
            }
        }

        // Reset file input so user can pick the same file again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    /**
     * Set an image as primary.
     * In create mode: just update local state.
     * In edit mode: call API.
     */
    async function handleSetPrimary(target: ProductImage | PendingImage) {
        if (isCreateMode) {
            const updated = pendingImages.map((img) => ({
                ...img,
                isPrimary: img.id === target.id,
            }));
            onPendingChange?.(updated);
            return;
        }

        // Edit mode
        try {
            await setPrimaryMutation.mutateAsync({
                id: target.id,
                productId: productId!,
            });
            toast({
                title: t('product.image.primaryUpdated'),
                variant: 'success',
            });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    /**
     * Remove an image.
     */
    async function handleRemove(target: ProductImage | PendingImage) {
        if (isCreateMode) {
            const filtered = pendingImages.filter((img) => img.id !== target.id);
            // If we removed the primary, promote the first remaining to primary
            if (
                (target as PendingImage).isPrimary &&
                filtered.length > 0 &&
                !filtered.some((img) => img.isPrimary)
            ) {
                filtered[0].isPrimary = true;
            }
            // Revoke the object URL to free memory
            URL.revokeObjectURL((target as PendingImage).previewUrl);
            onPendingChange?.(filtered);
            return;
        }

        // Edit mode
        try {
            await deleteMutation.mutateAsync({
                id: target.id,
                productId: productId!,
            });
            toast({
                title: t('product.image.deleted'),
                variant: 'success',
            });
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    // Clean up object URLs on unmount
    React.useEffect(() => {
        return () => {
            pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                multiple
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
                disabled={isMutating || !canAddMore}
            />

            {/* Empty state — large dropzone */}
            {totalCount === 0 && (
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isMutating}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-pink-300 hover:bg-pink-50/50 dark:hover:border-pink-500/50 dark:hover:bg-pink-500/5"
                >
                    {bulkUploadMutation.isPending ? (
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    ) : (
                        <ImagePlus className="size-8 text-muted-foreground" />
                    )}
                    <div className="text-center">
                        <p className="text-sm font-medium text-foreground">
                            {t('product.image.dropzoneTitle')}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('product.image.dropzoneHelp')}
                        </p>
                    </div>
                </button>
            )}

            {/* Gallery — primary image (large) + grid of others + add button */}
            {totalCount > 0 && (
                <div className="space-y-3">
                    <PrimaryImageDisplay
                        serverImages={serverImages}
                        pendingImages={pendingImages}
                    />

                    <div className="grid grid-cols-4 gap-2">
                        {/* Server images */}
                        {serverImages.map((img) => (
                            <ImageThumbnail
                                key={img.id}
                                src={getFileUrl(img.imageUrl) ?? ''}
                                isPrimary={img.imageType === 'primary'}
                                isPending={false}
                                disabled={isMutating}
                                onSetPrimary={() => void handleSetPrimary(img)}
                                onRemove={() => void handleRemove(img)}
                            />
                        ))}

                        {/* Pending images (local previews) */}
                        {pendingImages.map((img) => (
                            <ImageThumbnail
                                key={img.id}
                                src={img.previewUrl}
                                isPrimary={img.isPrimary}
                                isPending={true}
                                disabled={isMutating}
                                onSetPrimary={() => void handleSetPrimary(img)}
                                onRemove={() => void handleRemove(img)}
                            />
                        ))}

                        {/* Add more tile */}
                        {canAddMore && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isMutating}
                                className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-pink-300 hover:bg-pink-50/50 dark:hover:border-pink-500/50 dark:hover:bg-pink-500/5"
                            >
                                {bulkUploadMutation.isPending ? (
                                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                                ) : (
                                    <ImagePlus className="size-5 text-muted-foreground" />
                                )}
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {t('product.image.count')
                            .replace('{current}', String(totalCount))
                            .replace('{max}', String(MAX_IMAGES))}
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Large preview of the primary image at the top of the gallery.
 */
function PrimaryImageDisplay({
                                 serverImages,
                                 pendingImages,
                             }: {
    serverImages: ProductImage[];
    pendingImages: PendingImage[];
}) {
    // Find primary from server first, then pending
    const primaryServer = serverImages.find((i) => i.imageType === 'primary');
    const primaryPending = pendingImages.find((i) => i.isPrimary);
    const fallbackServer = serverImages[0];
    const fallbackPending = pendingImages[0];

    const src = primaryServer
        ? (getFileUrl(primaryServer.imageUrl) ?? '')
        : primaryPending
            ? primaryPending.previewUrl
            : fallbackServer
                ? (getFileUrl(fallbackServer.imageUrl) ?? '')
                : fallbackPending?.previewUrl ?? '';

    if (!src) return null;

    return (
        <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
            <Image
                src={src}
                alt="Primary product image"
                fill
                className="object-contain"
                unoptimized
            />
        </div>
    );
}

/**
 * A single thumbnail tile with hover overlay actions.
 */
function ImageThumbnail({
                            src,
                            isPrimary,
                            isPending,
                            disabled,
                            onSetPrimary,
                            onRemove,
                        }: {
    src: string;
    isPrimary: boolean;
    isPending: boolean;
    disabled?: boolean;
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
            <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                unoptimized
            />

            {/* Primary badge */}
            {isPrimary && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded-md bg-pink-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                    <Star className="size-2.5 fill-current" />
                </div>
            )}

            {/* Pending indicator */}
            {isPending && (
                <div className="absolute right-1 top-1 rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                    NEW
                </div>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                {!isPrimary && (
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={disabled}
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
                    disabled={disabled}
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