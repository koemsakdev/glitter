'use client';

import type { Control } from 'react-hook-form';
import { Controller, useWatch } from 'react-hook-form';
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '@/types/product';

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

interface ProductFormPricingProps {
    control: Control<ProductFormValues>;
}

export function ProductFormPricing({ control }: ProductFormPricingProps) {
    const { t } = useI18n();
    const price = Number(useWatch({ control, name: 'price' }) ?? 0);
    const before = Number(useWatch({ control, name: 'originalPrice' }) ?? 0);
    const onSale = before > 0 && price > 0 && before > price;
    const badSale = before > 0 && price > 0 && before <= price;

    function translateError(message: string | undefined): string {
        if (!message) return '';
        if (message.startsWith('product.validation.')) {
            return t(message as never);
        }
        return message;
    }

    return (
        <FieldGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                    name="price"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                            <FieldLabel htmlFor="product-price">
                                {t('product.field.price')}
                            </FieldLabel>
                            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                                <Input
                                    id="product-price"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    placeholder="0.00"
                                    className={`${inputClass} pl-7`}
                                    aria-invalid={fieldState.invalid}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        field.onChange(v === '' ? undefined : Number(v));
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </div>
                            <FieldDescription>{t('product.field.price.help')}</FieldDescription>
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
                    name="originalPrice"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field>
                            <FieldLabel htmlFor="product-original-price">
                                {t('product.field.originalPrice')}
                            </FieldLabel>
                            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                                <Input
                                    id="product-original-price"
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    placeholder="0.00"
                                    className={`${inputClass} pl-7`}
                                    value={field.value ?? ''}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        field.onChange(v === '' ? undefined : Number(v));
                                    }}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    ref={field.ref}
                                />
                            </div>
                            <FieldDescription>
                                {t('product.field.originalPrice.help')}
                            </FieldDescription>
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

            {/* How the price shows in the store */}
            {price > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <span className="text-xs text-muted-foreground">
                        {t('product.pricing.preview')}
                    </span>
                    {onSale && (
                        <span className="text-muted-foreground line-through">
                            ${before.toFixed(2)}
                        </span>
                    )}
                    <span className="font-semibold">${price.toFixed(2)}</span>
                    {onSale && (
                        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                            −{Math.round((1 - price / before) * 100)}%
                        </span>
                    )}
                    {badSale && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                            {t('product.pricing.notASale')}
                        </span>
                    )}
                </div>
            )}
        </FieldGroup>
    );
}