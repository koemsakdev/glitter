'use client';

import {zodResolver} from '@hookform/resolvers/zod';
import {Loader2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import React from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import {Button} from '@/components/ui/button';
import {useToast} from '@/hooks/use-toast';
import {productImageApi} from '@/features/product-images/product-image-api';
import {useProductImages} from '@/features/product-images/use-product-images';
import {productVariantApi} from '@/features/product-variants/product-variant-api';
import {useProductVariants} from '@/features/product-variants/use-product-variants';
import {
    useCreateProduct,
    useUpdateProduct,
} from '@/features/products/use-products';
import {getErrorMessage} from '@/lib/api-client';
import {useI18n} from '@/lib/i18n';
import type {
    Product,
    ProductFormValues,
    VariantFormValue,
} from '@/types/product';
import {ProductFormBasic} from './product-form-basic';
import {ProductFormOrganization} from './product-form-organization';
import {ProductFormPricing} from './product-form-pricing';
import {ProductFormStatus} from './product-form-status';
import {
    ProductImageUploader,
    type PendingImage,
} from './product-image-uploader';
import {ProductVariantsSection} from './product-variants-section';

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

export function ProductForm({product, title, subtitle}: ProductFormProps) {
    const {t} = useI18n();
    const router = useRouter();
    const {toast} = useToast();
    const isEditMode = Boolean(product);

    const createMutation = useCreateProduct();
    const updateMutation = useUpdateProduct();

    // Server data
    const {data: serverImages} = useProductImages(product?.id);
    const {data: serverVariants} = useProductVariants(product?.id);

    // Pending state (used in create mode; in edit mode we go straight to server)
    const [pendingImages, setPendingImages] = React.useState<PendingImage[]>([]);
    const [pendingVariants, setPendingVariants] = React.useState<
        VariantFormValue[]
    >([]);

    // Has-variants toggle — derived from server in edit mode
    const [hasVariants, setHasVariants] = React.useState(false);
    const [singleStock, setSingleStock] = React.useState(0);

    // Initialize variant state from server data when it loads (edit mode)
    React.useEffect(() => {
        if (!serverVariants || serverVariants.length === 0) return;
        // If there's only one variant with no size/color, it's the auto-default —
        // treat as "single variant" mode and pre-fill stock
        const isOnlyDefault =
            serverVariants.length === 1 &&
            !serverVariants[0].size &&
            !serverVariants[0].color;
        if (isOnlyDefault) {
            setHasVariants(false);
            setSingleStock(serverVariants[0].quantityInStock);
        } else {
            setHasVariants(true);
        }
    }, [serverVariants]);

    // Tracks the multi-step submit state for create mode
    const [creationStep, setCreationStep] = React.useState<
        'idle' | 'creating' | 'uploadingImages' | 'finalizing' | 'creatingVariants'
    >('idle');

    const isPending =
        createMutation.isPending ||
        updateMutation.isPending ||
        creationStep !== 'idle';

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

    // Watch SKU for live updates to variant SKU auto-generation
    const productSku = form.watch('sku');

    async function onSubmit(values: FormValues) {
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

        // ========================================================================
        // EDIT MODE
        // ========================================================================
        if (product) {
            try {
                await updateMutation.mutateAsync({id: product.id, values: payload});

                // If in single-variant mode, update the default variant's stock
                if (!hasVariants && serverVariants && serverVariants.length === 1) {
                    const defaultVariant = serverVariants[0];
                    if (defaultVariant.quantityInStock !== singleStock) {
                        try {
                            await productVariantApi.update(defaultVariant.id, {
                                quantityInStock: singleStock,
                            });
                        } catch (error) {
                            console.warn('Failed to update single variant stock:', error);
                        }
                    }
                }

                toast({
                    title: t('product.edit.success'),
                    variant: 'success',
                });
                router.push(`/dashboard/products/${product.id}`);
            } catch (error) {
                toast({
                    title: t('common.toast.error'),
                    description: getErrorMessage(error),
                    variant: 'destructive',
                });
            }
            return;
        }

        // ========================================================================
        // CREATE MODE — 4-step flow
        // ========================================================================

        // Validate variants before submitting if user added any
        if (hasVariants && pendingVariants.length > 0) {
            const seen = new Set<string>();
            for (const v of pendingVariants) {
                if (!v.variantSku.trim()) {
                    toast({
                        title: t('common.toast.error'),
                        description: t('product.variant.skuRequired'),
                        variant: 'destructive',
                    });
                    return;
                }
                const key = `${v.size}|${v.color}`;
                if (seen.has(key)) {
                    toast({
                        title: t('common.toast.error'),
                        description: t('product.variant.duplicateCombo'),
                        variant: 'destructive',
                    });
                    return;
                }
                seen.add(key);
            }
        }

        try {
            // STEP 1 — Create product
            setCreationStep('creating');
            const created = await createMutation.mutateAsync(payload);

            // STEP 2 — Upload images if any
            if (pendingImages.length > 0) {
                setCreationStep('uploadingImages');
                const files = pendingImages.map((img) => img.file);
                const uploaded = await productImageApi.bulkUpload(
                    created.id,
                    files,
                    'gallery',
                );

                // STEP 3 — Set primary image
                const primaryPendingIndex = pendingImages.findIndex(
                    (img) => img.isPrimary,
                );
                if (primaryPendingIndex >= 0 && uploaded[primaryPendingIndex]) {
                    setCreationStep('finalizing');
                    await productImageApi.setPrimary(uploaded[primaryPendingIndex].id);
                }
            }

            // STEP 4 — Create variants
            if (hasVariants && pendingVariants.length > 0) {
                setCreationStep('creatingVariants');
                await productVariantApi.createBulk({
                    productId: created.id,
                    variants: pendingVariants.map((v) => ({
                        variantSku: v.variantSku,
                        size: v.size || undefined,
                        color: v.color || undefined,
                        colorHex: v.colorHex || undefined,
                        quantityInStock: v.quantityInStock,
                        priceOverride: v.priceOverride ?? undefined,
                    })),
                });
            } else if (!hasVariants && singleStock > 0) {
                // Update the auto-default variant's stock to the single stock value
                setCreationStep('creatingVariants');
                try {
                    const variants =
                        await productVariantApi.listByProduct(created.id);
                    if (variants.length === 1) {
                        await productVariantApi.update(variants[0].id, {
                            quantityInStock: singleStock,
                        });
                    }
                } catch (error) {
                    console.warn('Failed to set initial stock:', error);
                }
            }

            // Clean up object URLs
            pendingImages.forEach((img) => URL.revokeObjectURL(img.previewUrl));

            toast({
                title: t('product.create.success'),
                variant: 'success',
            });
            router.push(`/dashboard/products/${created.id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setCreationStep('idle');
        }
    }

    // Submit button label changes per step
    function getSubmitLabel(): string {
        if (isEditMode) return t('product.edit.submit');
        if (creationStep === 'creating') return t('product.create.creating');
        if (creationStep === 'uploadingImages')
            return t('product.create.uploadingImages');
        if (creationStep === 'finalizing') return t('product.create.finalizing');
        if (creationStep === 'creatingVariants')
            return t('product.create.creatingVariants');
        return t('product.create.submit');
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header — title + actions */}
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
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin"/>}
                        {getSubmitLabel()}
                    </Button>
                </div>
            </div>

            {/* Main grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* MAIN CONTENT — left, 2/3 */}
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
                        <ProductFormPricing control={form.control}/>
                    </FormSection>

                    <FormSection
                        title={t('product.form.variants')}
                        description={t('product.form.variantsDescription')}
                    >
                        <ProductVariantsSection
                            productId={product?.id}
                            productSku={productSku}
                            serverVariants={serverVariants ?? []}
                            pendingVariants={pendingVariants}
                            onPendingChange={setPendingVariants}
                            hasVariants={hasVariants}
                            onHasVariantsChange={setHasVariants}
                            singleStock={singleStock}
                            onSingleStockChange={setSingleStock}
                        />
                    </FormSection>
                </div>

                {/* SIDEBAR — right, 1/3 */}
                <div className="space-y-6">
                    <FormSection
                        title={t('product.form.images')}
                        description={t('product.form.imagesDescription')}
                    >
                        <ProductImageUploader
                            productId={product?.id}
                            serverImages={serverImages ?? []}
                            pendingImages={pendingImages}
                            onPendingChange={setPendingImages}
                        />
                    </FormSection>

                    <FormSection title={t('product.form.status')}>
                        <ProductFormStatus control={form.control}/>
                    </FormSection>

                    <FormSection
                        title={t('product.form.organization')}
                        description={t('product.form.organizationDescription')}
                    >
                        <ProductFormOrganization control={form.control}/>
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