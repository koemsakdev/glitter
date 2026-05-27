'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import type { ProductFormValues } from '@/types/product';

const inputClass =
    'h-11 shadow-none focus:shadow-none focus-visible:shadow-none focus:outline-0 focus-visible:outline-none focus:ring-0 focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

interface ProductFormStatusProps {
    control: Control<ProductFormValues>;
}

export function ProductFormStatus({ control }: ProductFormStatusProps) {
    const { t } = useI18n();

    return (
        <FieldGroup>
            <Controller
                name="status"
                control={control}
                render={({ field }) => (
                    <Field>
                        <FieldLabel htmlFor="product-status">
                            {t('product.field.status')}
                        </FieldLabel>
                        <Select
                            value={field.value ?? 'draft'}
                            onValueChange={(v) => v && field.onChange(v)}
                        >
                            <SelectTrigger id="product-status" className={inputClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">
                                    {t('product.status.draft')}
                                </SelectItem>
                                <SelectItem value="active">
                                    {t('product.status.active')}
                                </SelectItem>
                                <SelectItem value="out_of_stock">
                                    {t('product.status.outOfStock')}
                                </SelectItem>
                                <SelectItem value="discontinued">
                                    {t('product.status.discontinued')}
                                </SelectItem>
                                <SelectItem value="archived">
                                    {t('product.status.archived')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                )}
            />
        </FieldGroup>
    );
}