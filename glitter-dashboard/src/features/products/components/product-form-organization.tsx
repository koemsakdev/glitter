'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useBrandOptions } from '@/lib/hooks/use-brand-options';
import { useCategoryOptions } from '@/lib/hooks/use-category-options';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '@/types/product';

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

interface ProductFormOrganizationProps {
    control: Control<ProductFormValues>;
}

export function ProductFormOrganization({
                                            control,
                                        }: ProductFormOrganizationProps) {
    const { t, language } = useI18n();
    const { data: brands, isLoading: brandsLoading } = useBrandOptions();
    const { data: categories, isLoading: categoriesLoading } =
        useCategoryOptions();

    const brandOptions: ComboboxOption[] = useMemo(
        () =>
            (brands ?? []).map((b) => ({
                value: b.id,
                label: b.name,
            })),
        [brands],
    );

    const categoryOptions: ComboboxOption[] = useMemo(
        () =>
            (categories ?? []).map((c) => ({
                value: c.id,
                label: language === 'km' ? c.nameKm : c.nameEn,
                secondary: language === 'km' ? c.nameEn : c.nameKm,
            })),
        [categories, language],
    );

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('product.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <FieldGroup>
            <Controller
                name="brandId"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>{t('product.field.brand')}</FieldLabel>
                        <Combobox
                            options={brandOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('product.field.brand.placeholder')}
                            searchPlaceholder={t('product.field.brand.search')}
                            emptyMessage={t('product.field.brand.empty')}
                            isLoading={brandsLoading}
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
                name="categoryId"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>{t('product.field.category')}</FieldLabel>
                        <Combobox
                            options={categoryOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder={t('product.field.category.placeholder')}
                            searchPlaceholder={t('product.field.category.search')}
                            emptyMessage={t('product.field.category.empty')}
                            isLoading={categoriesLoading}
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
                name="sku"
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="product-sku">
                            {t('product.field.sku')}
                        </FieldLabel>
                        <Input
                            {...field}
                            id="product-sku"
                            placeholder="GUC-BAG-001"
                            className={`${inputClass} font-mono`}
                            aria-invalid={fieldState.invalid}
                        />
                        <FieldDescription>{t('product.field.sku.help')}</FieldDescription>
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
                name="productType"
                control={control}
                render={({ field }) => (
                    <Field>
                        <FieldLabel htmlFor="product-type">
                            {t('product.field.type')}
                        </FieldLabel>
                        <Select
                            value={field.value ?? 'standard'}
                            onValueChange={(v) => v && field.onChange(v)}
                        >
                            <SelectTrigger id="product-type" className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="standard">
                                    {t('product.type.standard')}
                                </SelectItem>
                                <SelectItem value="featured">
                                    {t('product.type.featured')}
                                </SelectItem>
                                <SelectItem value="limited">
                                    {t('product.type.limited')}
                                </SelectItem>
                                <SelectItem value="exclusive">
                                    {t('product.type.exclusive')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                )}
            />

            <Controller
                name="hasBox"
                control={control}
                render={({ field }) => (
                    <Field>
                        <label className="flex cursor-pointer items-center gap-2">
                            <Checkbox
                                checked={field.value ?? false}
                                onCheckedChange={field.onChange}
                            />
                            <span className="text-sm font-medium">
                {t('product.field.hasBox')}
              </span>
                        </label>
                        <FieldDescription>{t('product.field.hasBox.help')}</FieldDescription>
                    </Field>
                )}
            />
        </FieldGroup>
    );
}