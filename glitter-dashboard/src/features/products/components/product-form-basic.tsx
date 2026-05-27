'use client';

import { Loader2, Sparkles } from 'lucide-react';
import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { toast } from 'sonner';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useGenerateCategoryInfo } from '@/features/ai/use-ai';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '@/types/product';

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
    getValues: <K extends keyof ProductFormValues>(name: K) => ProductFormValues[K];
    isEditMode: boolean;
}

export function ProductFormBasic({
                                     control,
                                     setValue,
                                     getValues,
                                     isEditMode,
                                 }: ProductFormBasicProps) {
    const { t } = useI18n();

    const generateDescEn = useGenerateCategoryInfo();
    const generateDescKm = useGenerateCategoryInfo();

    function handleNameEnBlur(name: string) {
        if (isEditMode) return;
        const currentSlug = getValues('slug');
        if (currentSlug) return;
        const slug = name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
        if (slug) setValue('slug', slug, { shouldDirty: true });
    }

    async function handleGenerateDescription(language: 'en' | 'km') {
        const name =
            language === 'km'
                ? getValues('nameKm')?.trim()
                : getValues('nameEn')?.trim();

        if (!name) {
            toast.error(t('product.ai.nameRequired'));
            return;
        }

        const mutation = language === 'km' ? generateDescKm : generateDescEn;
        const fieldName: 'descriptionEn' | 'descriptionKm' =
            language === 'km' ? 'descriptionKm' : 'descriptionEn';

        try {
            const result = await mutation.mutateAsync({
                name,
                field: 'description',
                language,
            });
            if (!result.value) {
                toast.error(t('product.ai.notFound'));
                return;
            }
            setValue(fieldName, result.value, {
                shouldValidate: true,
                shouldDirty: true,
            });
            toast.success(t('product.ai.success'));
        } catch (error) {
            const message = getErrorMessage(error);
            if (
                message.toLowerCase().includes('unavailable') ||
                message.toLowerCase().includes('high demand')
            ) {
                toast.error(t('product.ai.busy'));
            } else {
                toast.error(message);
            }
        }
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
            {/* Names — En + Km side by side */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                    name="nameEn"
                    control={control}
                    render={({ field, fieldState }) => (
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
                    render={({ field, fieldState }) => (
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
                render={({ field, fieldState }) => (
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

            {/* Description English with AI sparkle */}
            <Controller
                name="descriptionEn"
                control={control}
                render={({ field }) => (
                    <Field>
                        <FieldLabel htmlFor="product-desc-en">
                            {t('product.field.descriptionEn')}
                        </FieldLabel>
                        <div className="relative">
                            <Textarea
                                {...field}
                                id="product-desc-en"
                                rows={3}
                                placeholder="Brief product description in English"
                                className={`${textareaClass} pr-12`}
                                disabled={generateDescEn.isPending}
                            />
                            <button
                                type="button"
                                onClick={() => handleGenerateDescription('en')}
                                disabled={generateDescEn.isPending}
                                className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-pink-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                                aria-label={t('product.ai.generateDescriptionEn')}
                                title={t('product.ai.generateDescriptionEn')}
                            >
                                {generateDescEn.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Sparkles className="size-4" />
                                )}
                            </button>
                        </div>
                        <FieldDescription>
                            {t('product.field.descriptionEn.help')}
                        </FieldDescription>
                    </Field>
                )}
            />

            {/* Description Khmer with AI sparkle */}
            <Controller
                name="descriptionKm"
                control={control}
                render={({ field }) => (
                    <Field>
                        <FieldLabel htmlFor="product-desc-km">
                            {t('product.field.descriptionKm')}
                        </FieldLabel>
                        <div className="relative">
                            <Textarea
                                {...field}
                                id="product-desc-km"
                                rows={3}
                                placeholder="ការពិពណ៌នាខ្លីៗជាភាសាខ្មែរ"
                                className={`${textareaClass} pr-12`}
                                disabled={generateDescKm.isPending}
                            />
                            <button
                                type="button"
                                onClick={() => handleGenerateDescription('km')}
                                disabled={generateDescKm.isPending}
                                className="absolute bottom-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-pink-100 hover:text-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-pink-500/15 dark:hover:text-pink-300"
                                aria-label={t('product.ai.generateDescriptionKm')}
                                title={t('product.ai.generateDescriptionKm')}
                            >
                                {generateDescKm.isPending ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Sparkles className="size-4" />
                                )}
                            </button>
                        </div>
                    </Field>
                )}
            />

            {/* Details En + Km — longer-form content */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                    name="detailsEn"
                    control={control}
                    render={({ field }) => (
                        <Field>
                            <FieldLabel htmlFor="product-details-en">
                                {t('product.field.detailsEn')}
                            </FieldLabel>
                            <Textarea
                                {...field}
                                id="product-details-en"
                                rows={5}
                                placeholder="Materials, care instructions, dimensions..."
                                className={textareaClass}
                            />
                        </Field>
                    )}
                />

                <Controller
                    name="detailsKm"
                    control={control}
                    render={({ field }) => (
                        <Field>
                            <FieldLabel htmlFor="product-details-km">
                                {t('product.field.detailsKm')}
                            </FieldLabel>
                            <Textarea
                                {...field}
                                id="product-details-km"
                                rows={5}
                                placeholder="សម្ភារៈ ការថែទាំ វិមាត្រ..."
                                className={textareaClass}
                            />
                        </Field>
                    )}
                />
            </div>
        </FieldGroup>
    );
}