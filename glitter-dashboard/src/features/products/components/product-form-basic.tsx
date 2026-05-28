'use client';

import {Loader2, Sparkles} from 'lucide-react';
import type {Control} from 'react-hook-form';
import {Controller, useWatch} from 'react-hook-form';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {useToast} from '@/hooks/use-toast';
import {useGenerateProductInfo} from '@/features/ai/use-ai';
import {getErrorMessage} from '@/lib/api-client';
import {useBrandOptions} from '@/lib/hooks/use-brand-options';
import {useCategoryOptions} from '@/lib/hooks/use-category-options';
import {useI18n} from '@/lib/i18n';
import type {ProductFormValues} from '@/types/product';
import type {ControllerRenderProps} from 'react-hook-form';

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

const textareaClass =
    'shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

interface ProductFormBasicProps {
    control: Control<ProductFormValues>;
    setValue: (
        name: keyof ProductFormValues,
        value: string,
        options?: { shouldValidate?: boolean; shouldDirty?: boolean },
    ) => void;
    getValues: <K extends keyof ProductFormValues>(
        name: K,
    ) => ProductFormValues[K];
    isEditMode: boolean;
}

export function ProductFormBasic({
                                     control,
                                     setValue,
                                     getValues,
                                     isEditMode,
                                 }: ProductFormBasicProps) {
    const {t, language} = useI18n();
    const {toast} = useToast();

    // Resolve brand/category names for AI context
    const {data: brands} = useBrandOptions();
    const {data: categories} = useCategoryOptions();

    // Watch the selected brand/category so AI context stays current
    const brandId = useWatch({control, name: 'brandId'});
    const categoryId = useWatch({control, name: 'categoryId'});

    // One mutation instance per field+language so spinners are independent
    const genDescEn = useGenerateProductInfo();
    const genDescKm = useGenerateProductInfo();
    const genDetailsEn = useGenerateProductInfo();
    const genDetailsKm = useGenerateProductInfo();

    function resolveContext() {
        const brand = brands?.find((b) => b.id === brandId);
        const category = categories?.find((c) => c.id === categoryId);
        return {
            brandName: brand?.name,
            categoryName: category
                ? language === 'km'
                    ? category.nameKm
                    : category.nameEn
                : undefined,
        };
    }

    async function handleGenerate(
        field: 'description' | 'details',
        lang: 'en' | 'km',
        mutation: ReturnType<typeof useGenerateProductInfo>,
        targetField: keyof ProductFormValues,
    ) {
        // Use the name in the matching language; fall back to the other if empty
        const nameInLang =
            lang === 'km'
                ? getValues('nameKm')?.trim() || getValues('nameEn')?.trim()
                : getValues('nameEn')?.trim() || getValues('nameKm')?.trim();

        if (!nameInLang) {
            toast({
                title: t('common.toast.error'),
                description: t('product.ai.nameRequired'),
                variant: 'destructive',
            });
            return;
        }

        const context = resolveContext();

        try {
            const result = await mutation.mutateAsync({
                name: nameInLang,
                brandName: context.brandName,
                categoryName: context.categoryName,
                field,
                language: lang,
            });
            if (!result.value) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.ai.notFound'),
                    variant: 'destructive',
                });
                return;
            }
            setValue(targetField, result.value, {
                shouldValidate: true,
                shouldDirty: true,
            });
            toast({title: t('product.ai.success'), variant: 'success'});
        } catch (error) {
            const message = getErrorMessage(error);
            const lower = message.toLowerCase();
            if (lower.includes('unavailable') || lower.includes('rate limit')) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.ai.busy'),
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: t('common.toast.error'),
                    description: message,
                    variant: 'destructive',
                });
            }
        }
    }

    function handleNameEnBlur(name: string) {
        if (isEditMode) return;
        if (getValues('slug')) return;
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        if (slug) setValue('slug', slug, {shouldDirty: true});
    }

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('product.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <FieldGroup>
            {/* Names */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                    name="nameEn"
                    control={control}
                    render={({field, fieldState}) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="product-name-en">
                                {t('product.field.nameEn')}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="product-name-en"
                                placeholder="Gucci GG Marmont Bag"
                                className={inputClass}
                                aria-invalid={fieldState.invalid}
                                onBlur={(e) => {
                                    field.onBlur();
                                    handleNameEnBlur(e.target.value);
                                }}
                            />
                            {fieldState.invalid && fieldState.error && (
                                <FieldError
                                    errors={[
                                        {
                                            ...fieldState.error,
                                            message: translateError(fieldState.error.message),
                                        },
                                    ]}
                                />
                            )}
                        </Field>
                    )}
                />

                <Controller
                    name="nameKm"
                    control={control}
                    render={({field, fieldState}) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="product-name-km">
                                {t('product.field.nameKm')}
                            </FieldLabel>
                            <Input
                                {...field}
                                id="product-name-km"
                                placeholder="កាបូប Gucci GG Marmont"
                                className={inputClass}
                                aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && fieldState.error && (
                                <FieldError
                                    errors={[
                                        {
                                            ...fieldState.error,
                                            message: translateError(fieldState.error.message),
                                        },
                                    ]}
                                />
                            )}
                        </Field>
                    )}
                />
            </div>

            {/* Slug */}
            <Controller
                name="slug"
                control={control}
                render={({field, fieldState}) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="product-slug">
                            {t('product.field.slug')}
                        </FieldLabel>
                        <Input
                            {...field}
                            id="product-slug"
                            placeholder="gucci-gg-marmont-bag"
                            className={inputClass}
                            aria-invalid={fieldState.invalid}
                        />
                        <FieldDescription>{t('product.field.slug.help')}</FieldDescription>
                        {fieldState.invalid && fieldState.error && (
                            <FieldError
                                errors={[
                                    {
                                        ...fieldState.error,
                                        message: translateError(fieldState.error.message),
                                    },
                                ]}
                            />
                        )}
                    </Field>
                )}
            />

            {/* Description EN */}
            <Controller
                name="descriptionEn"
                control={control}
                render={({field}) => (
                    <Field>
                        <FieldLabel htmlFor="product-desc-en">
                            {t('product.field.descriptionEn')}
                        </FieldLabel>
                        <AiTextarea
                            id="product-desc-en"
                            field={field}
                            rows={3}
                            placeholder="Brief product description in English"
                            isPending={genDescEn.isPending}
                            onGenerate={() =>
                                handleGenerate('description', 'en', genDescEn, 'descriptionEn')
                            }
                            label={t('product.ai.generateDescriptionEn')}
                        />
                        <FieldDescription>
                            {t('product.field.descriptionEn.help')}
                        </FieldDescription>
                    </Field>
                )}
            />

            {/* Description KM */}
            <Controller
                name="descriptionKm"
                control={control}
                render={({field}) => (
                    <Field>
                        <FieldLabel htmlFor="product-desc-km">
                            {t('product.field.descriptionKm')}
                        </FieldLabel>
                        <AiTextarea
                            id="product-desc-km"
                            field={field}
                            rows={3}
                            placeholder="ការពិពណ៌នាខ្លីៗជាភាសាខ្មែរ"
                            isPending={genDescKm.isPending}
                            onGenerate={() =>
                                handleGenerate('description', 'km', genDescKm, 'descriptionKm')
                            }
                            label={t('product.ai.generateDescriptionKm')}
                        />
                    </Field>
                )}
            />

            {/* Details EN + KM */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                    name="detailsEn"
                    control={control}
                    render={({field}) => (
                        <Field>
                            <FieldLabel htmlFor="product-details-en">
                                {t('product.field.detailsEn')}
                            </FieldLabel>
                            <AiTextarea
                                id="product-details-en"
                                field={field}
                                rows={5}
                                placeholder="Materials, care instructions, dimensions..."
                                isPending={genDetailsEn.isPending}
                                onGenerate={() =>
                                    handleGenerate('details', 'en', genDetailsEn, 'detailsEn')
                                }
                                label={t('product.ai.generateDetailsEn')}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="detailsKm"
                    control={control}
                    render={({field}) => (
                        <Field>
                            <FieldLabel htmlFor="product-details-km">
                                {t('product.field.detailsKm')}
                            </FieldLabel>
                            <AiTextarea
                                id="product-details-km"
                                field={field}
                                rows={5}
                                placeholder="សម្ភារៈ ការថែទាំ វិមាត្រ..."
                                isPending={genDetailsKm.isPending}
                                onGenerate={() =>
                                    handleGenerate('details', 'km', genDetailsKm, 'detailsKm')
                                }
                                label={t('product.ai.generateDetailsKm')}
                            />
                        </Field>
                    )}
                />
            </div>
        </FieldGroup>
    );
}


/**
 * Textarea with an AI sparkle button in the bottom-right corner.
 */
function AiTextarea({
    id,
    field,
    rows,
    placeholder,
    isPending,
    onGenerate,
    label,
}: {
    id: string;
    field: ControllerRenderProps<ProductFormValues,
        'descriptionEn' | 'descriptionKm' | 'detailsEn' | 'detailsKm'
    >;
    rows: number;
    placeholder: string;
    isPending: boolean;
    onGenerate: () => void;
    label: string;
}) {
    return (
        <div className="relative">
            <Textarea
                {...field}
                id={id}
                value={field.value ?? ''}
                rows={rows}
                placeholder={placeholder}
                className={`${textareaClass} pr-12`}
                disabled={isPending}
            />
            <button
                type="button"
                onClick={onGenerate}
                disabled={isPending}
                className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-pink-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                aria-label={label}
                title={label}
            >
                {isPending ? (
                    <Loader2 className="size-4 animate-spin"/>
                ) : (
                    <Sparkles className="size-4"/>
                )}
            </button>
        </div>
    );
}