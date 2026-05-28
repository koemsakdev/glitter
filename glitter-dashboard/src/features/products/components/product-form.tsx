'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { productImageApi } from '@/features/product-images/product-image-api';
import { useProductImages } from '@/features/product-images/use-product-images';
import { productVariantApi } from '@/features/product-variants/product-variant-api';
import { useProductVariants } from '@/features/product-variants/use-product-variants';
import {
    useCreateProduct,
    useUpdateProduct,
} from '@/features/products/use-products';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type {
    ImageEditorState,
    ImageItem,
    Product,
    ProductFormValues,
    VariantEditorState,
    VariantRow,
} from '@/types/product';
import { ProductFormBasic } from './product-form-basic';
import { ProductFormOrganization } from './product-form-organization';
import { ProductFormPricing } from './product-form-pricing';
import { ProductFormStatus } from './product-form-status';
import { ProductImageUploader } from './product-image-uploader';
import { ProductVariantsSection } from './product-variants-section';

const formSchema = z.object({
    categoryId: z.string().uuid('product.validation.categoryRequired'),
    brandId: z.string().uuid('product.validation.brandRequired'),
    sku: z
        .string()
        .min(1, 'product.validation.skuRequired')
        .max(100, 'product.validation.skuTooLong'),
    nameEn: z
        .string()
        .min(1, 'product.validation.nameEnRequired')
        .max(255, 'product.validation.nameTooLong'),
    nameKm: z
        .string()
        .min(1, 'product.validation.nameKmRequired')
        .max(255, 'product.validation.nameTooLong'),
    slug: z
        .string()
        .min(1, 'product.validation.slugRequired')
        .max(255, 'product.validation.slugTooLong')
        .regex(/^[a-z0-9-]+$/, 'product.validation.slugFormat'),
    descriptionEn: z.string().optional(),
    descriptionKm: z.string().optional(),
    detailsEn: z.string().optional(),
    detailsKm: z.string().optional(),
    price: z.number().min(0, 'product.validation.priceMin'),
    originalPrice: z.number().min(0).optional(),
    productType: z
        .enum(['standard', 'featured', 'limited', 'exclusive'])
        .optional(),
    status: z
        .enum(['draft', 'active', 'out_of_stock', 'discontinued', 'archived'])
        .optional(),
    hasBox: z.boolean().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormProps {
    product?: Product | null;
    title: string;
    subtitle?: string;
}

type SubmitStep =
    | 'idle'
    | 'savingProduct'
    | 'savingImages'
    | 'savingVariants';

export function ProductForm({ product, title, subtitle }: ProductFormProps) {
    const { t } = useI18n();
    const router = useRouter();
    const { toast } = useToast();
    const isEditMode = Boolean(product);

    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();

    // Load existing images/variants in edit mode
    const { data: serverImages } = useProductImages(product?.id);
    const { data: serverVariants } = useProductVariants(product?.id);

    // ---- Local editor state (committed only on submit) ----
    const [imageState, setImageState] = React.useState<ImageEditorState>({
        items: [],
        deletedIds: [],
    });
    const [variantState, setVariantState] = React.useState<VariantEditorState>({
        rows: [],
        deletedIds: [],
    });
    const [hasVariants, setHasVariants] = React.useState(false);
    const [singleStock, setSingleStock] = React.useState(0);

    // Track whether we've seeded local state from server (so edits aren't clobbered)
    const seededImages = React.useRef(false);
    const seededVariants = React.useRef(false);

    // Seed image state once when server images arrive (edit mode)
    React.useEffect(() => {
        if (isEditMode && serverImages && !seededImages.current) {
            seededImages.current = true;
            const items: ImageItem[] = serverImages.map((img) => ({
                kind: 'existing',
                id: img.id,
                imageUrl: img.imageUrl,
                isPrimary: img.imageType === 'primary',
            }));
            setImageState({ items, deletedIds: [] });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverImages]);

    // Seed variant state once when server variants arrive (edit mode)
    React.useEffect(() => {
        if (isEditMode && serverVariants && !seededVariants.current) {
            seededVariants.current = true;
            // Detect single-variant (only one variant with no size/color = auto-default)
            const isOnlyDefault =
                serverVariants.length === 1 &&
                !serverVariants[0].size &&
                !serverVariants[0].color;

            if (isOnlyDefault) {
                setHasVariants(false);
                setSingleStock(serverVariants[0].quantityInStock);
                setVariantState({ rows: [], deletedIds: [] });
            } else {
                setHasVariants(true);
                const rows: VariantRow[] = serverVariants.map((v) => ({
                    id: v.id,
                    isExisting: true,
                    variantSku: v.variantSku,
                    size: v.size ?? '',
                    color: v.color ?? '',
                    colorHex: v.colorHex ?? '#000000',
                    quantityInStock: v.quantityInStock,
                    priceOverride: v.priceOverride,
                }));
                setVariantState({ rows, deletedIds: [] });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverVariants]);

    const [step, setStep] = React.useState<SubmitStep>('idle');
    const isPending =
        createMutation.isPending || updateMutation.isPending || step !== 'idle';

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            categoryId: product?.categoryId ?? '',
            brandId: product?.brandId ?? '',
            sku: product?.sku ?? '',
            nameEn: product?.nameEn ?? '',
            nameKm: product?.nameKm ?? '',
            slug: product?.slug ?? '',
            descriptionEn: product?.descriptionEn ?? '',
            descriptionKm: product?.descriptionKm ?? '',
            detailsEn: product?.detailsEn ?? '',
            detailsKm: product?.detailsKm ?? '',
            price: product?.price ?? 0,
            originalPrice: product?.originalPrice ?? undefined,
            productType: product?.productType ?? 'standard',
            status: product?.status ?? 'draft',
            hasBox: product?.hasBox ?? false,
        },
    });

    const productSku = form.watch('sku');

    /** Validate variants locally before any network call. */
    function validateVariants(): string | null {
        if (!hasVariants) return null;
        if (variantState.rows.length === 0) return null;

        const seenSkus = new Set<string>();
        const seenCombos = new Set<string>();

        for (const row of variantState.rows) {
            const hasSizeOrColor = row.size.trim() !== '' || row.color.trim() !== '';
            if (!hasSizeOrColor) {
                return t('product.variant.sizeOrColorRequired');
            }
            if (!row.variantSku.trim()) {
                return t('product.variant.skuRequired');
            }
            const skuKey = row.variantSku.trim().toLowerCase();
            if (seenSkus.has(skuKey)) {
                return t('product.variant.duplicateSku').replace('{sku}', row.variantSku);
            }
            seenSkus.add(skuKey);

            const colorIdentity = row.color.trim()
                ? row.color.trim().toLowerCase()
                : row.colorHex.toLowerCase();
            const comboKey = `${row.size.trim().toLowerCase()}|${colorIdentity}`;
            if (seenCombos.has(comboKey)) {
                return t('product.variant.duplicateCombo');
            }
            seenCombos.add(comboKey);
        }
        return null;
    }

    /** Commit image changes for a given product id. */
    async function commitImages(productId: string) {
        // 1. Delete removed existing images
        for (const id of imageState.deletedIds) {
            await productImageApi.delete(id);
        }

        // 2. Upload new images (bulk)
        const newItems = imageState.items.filter((i) => i.kind === 'new');
        const uploadedByLocalId = new Map<string, string>(); // localId -> serverId
        if (newItems.length > 0) {
            const files = newItems.map((i) => (i.kind === 'new' ? i.file : null)).filter(
                (f): f is File => f !== null,
            );
            const uploaded = await productImageApi.bulkUpload(
                productId,
                files,
                'gallery',
            );
            // Map uploaded server images back to the local items by order
            newItems.forEach((item, idx) => {
                if (uploaded[idx]) uploadedByLocalId.set(item.id, uploaded[idx].id);
            });
        }

        // 3. Set primary — resolve the primary item to a server id
        const primaryItem = imageState.items.find((i) => i.isPrimary);
        if (primaryItem) {
            const serverId =
                primaryItem.kind === 'existing'
                    ? primaryItem.id
                    : uploadedByLocalId.get(primaryItem.id);
            if (serverId) {
                await productImageApi.setPrimary(serverId);
            }
        }
    }

    /** Commit variant changes for a given product id. */
    async function commitVariants(productId: string) {
        if (!hasVariants) {
            // Single-variant mode: ensure the default variant's stock matches singleStock.
            // The product was created/exists with an auto-default variant.
            const current = await productVariantApi.listByProduct(productId);
            const defaultVariant =
                current.find((v) => !v.size && !v.color) ?? current[0];
            if (defaultVariant && defaultVariant.quantityInStock !== singleStock) {
                await productVariantApi.update(defaultVariant.id, {
                    quantityInStock: singleStock,
                });
            }
            return;
        }

        // Multi-variant mode:
        // 1. Delete removed existing variants FIRST (avoids unique-constraint clashes)
        for (const id of variantState.deletedIds) {
            await productVariantApi.delete(id);
        }

        // 2. Update changed existing rows
        const existingRows = variantState.rows.filter((r) => r.isExisting);
        for (const row of existingRows) {
            const original = serverVariants?.find((v) => v.id === row.id);
            if (!original) continue;
            const changed =
                row.variantSku !== original.variantSku ||
                row.size !== (original.size ?? '') ||
                row.color !== (original.color ?? '') ||
                row.colorHex !== (original.colorHex ?? '#000000') ||
                row.quantityInStock !== original.quantityInStock ||
                row.priceOverride !== original.priceOverride;
            if (changed) {
                await productVariantApi.update(row.id, {
                    variantSku: row.variantSku,
                    size: row.size || null,
                    color: row.color || null,
                    colorHex: row.colorHex || null,
                    quantityInStock: row.quantityInStock,
                    priceOverride: row.priceOverride,
                });
            }
        }

        // 3. Create new rows (bulk)
        const newRows = variantState.rows.filter((r) => !r.isExisting);
        if (newRows.length > 0) {
            await productVariantApi.createBulk({
                productId,
                variants: newRows.map((r) => ({
                    variantSku: r.variantSku,
                    size: r.size || undefined,
                    color: r.color || undefined,
                    colorHex: r.colorHex || undefined,
                    quantityInStock: r.quantityInStock,
                    priceOverride: r.priceOverride ?? undefined,
                })),
            });
        }
    }

    async function onSubmit(values: FormValues) {
        // Local validation first
        const variantError = validateVariants();
        if (variantError) {
            toast({
                title: t('common.toast.error'),
                description: variantError,
                variant: 'destructive',
            });
            return;
        }

        const payload: ProductFormValues = {
            categoryId: values.categoryId,
            brandId: values.brandId,
            sku: values.sku,
            nameEn: values.nameEn,
            nameKm: values.nameKm,
            slug: values.slug,
            descriptionEn: values.descriptionEn || undefined,
            descriptionKm: values.descriptionKm || undefined,
            detailsEn: values.detailsEn || undefined,
            detailsKm: values.detailsKm || undefined,
            price: values.price,
            originalPrice: values.originalPrice,
            productType: values.productType,
            status: values.status,
            hasBox: values.hasBox,
        };

        try {
            // STEP 1 — product
            setStep('savingProduct');
            const saved = product
                ? await updateMutation.mutateAsync({ id: product.id, values: payload })
                : await createMutation.mutateAsync(payload);

            // STEP 2 — images
            const hasImageWork =
                imageState.items.some((i) => i.kind === 'new') ||
                imageState.deletedIds.length > 0 ||
                imageState.items.some((i) => i.isPrimary);
            if (hasImageWork) {
                setStep('savingImages');
                await commitImages(saved.id);
            }

            // STEP 3 — variants
            setStep('savingVariants');
            await commitVariants(saved.id);

            // Cleanup object URLs
            imageState.items.forEach((i) => {
                if (i.kind === 'new') URL.revokeObjectURL(i.previewUrl);
            });

            toast({
                title: product
                    ? t('product.edit.success')
                    : t('product.create.success'),
                variant: 'success',
            });
            router.push(`/dashboard/products/${saved.id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setStep('idle');
        }
    }

    function getSubmitLabel(): string {
        if (step === 'savingProduct') return t('product.save.savingProduct');
        if (step === 'savingImages') return t('product.save.savingImages');
        if (step === 'savingVariants') return t('product.save.savingVariants');
        return isEditMode ? t('product.edit.submit') : t('product.create.submit');
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {getSubmitLabel()}
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Main */}
                <div className="space-y-6 lg:col-span-2">
                    <FormSection
                        title={t('product.form.basic')}
                        description={t('product.form.basicDescription')}
                    >
                        <ProductFormBasic
                            control={form.control}
                            setValue={form.setValue}
                            getValues={form.getValues}
                            isEditMode={isEditMode}
                        />
                    </FormSection>

                    <FormSection
                        title={t('product.form.pricing')}
                        description={t('product.form.pricingDescription')}
                    >
                        <ProductFormPricing control={form.control} />
                    </FormSection>

                    <FormSection
                        title={t('product.form.variants')}
                        description={t('product.form.variantsDescription')}
                    >
                        <ProductVariantsSection
                            productSku={productSku}
                            state={variantState}
                            onChange={setVariantState}
                            hasVariants={hasVariants}
                            onHasVariantsChange={setHasVariants}
                            singleStock={singleStock}
                            onSingleStockChange={setSingleStock}
                        />
                    </FormSection>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <FormSection
                        title={t('product.form.images')}
                        description={t('product.form.imagesDescription')}
                    >
                        <ProductImageUploader
                            state={imageState}
                            onChange={setImageState}
                        />
                    </FormSection>

                    <FormSection title={t('product.form.status')}>
                        <ProductFormStatus control={form.control} />
                    </FormSection>

                    <FormSection
                        title={t('product.form.organization')}
                        description={t('product.form.organizationDescription')}
                    >
                        <ProductFormOrganization control={form.control} />
                    </FormSection>
                </div>
            </div>
        </form>
    );
}

function FormSection({
                         title,
                         description,
                         children,
                     }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
                {description && (
                    <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}