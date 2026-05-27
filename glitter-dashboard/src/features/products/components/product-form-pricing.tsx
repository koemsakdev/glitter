'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
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
        </FieldGroup>
    );
}