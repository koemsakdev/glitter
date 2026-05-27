'use client';

import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPickerInput } from '@/components/ui/color-picker-input';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { generateVariantSku } from '@/lib/sku-generator';
import {
    useCreateProductVariant,
    useDeleteProductVariant,
    useUpdateProductVariant,
} from '@/features/product-variants/use-product-variants';
import type { ProductVariant, VariantFormValue } from '@/types/product';

interface ProductVariantsSectionProps {
    /** Product ID — undefined in create mode */
    productId?: string;
    productSku: string;
    serverVariants?: ProductVariant[];
    pendingVariants: VariantFormValue[];
    onPendingChange: (variants: VariantFormValue[]) => void;
    hasVariants: boolean;
    onHasVariantsChange: (hasVariants: boolean) => void;
    singleStock: number;
    onSingleStockChange: (stock: number) => void;
}

export function ProductVariantsSection({
                                           productId,
                                           productSku,
                                           serverVariants = [],
                                           pendingVariants,
                                           onPendingChange,
                                           hasVariants,
                                           onHasVariantsChange,
                                           singleStock,
                                           onSingleStockChange,
                                       }: ProductVariantsSectionProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isCreateMode = !productId;

    const createMutation = useCreateProductVariant();
    const updateMutation = useUpdateProductVariant();
    const deleteMutation = useDeleteProductVariant();

    const isMutating =
        createMutation.isPending ||
        updateMutation.isPending ||
        deleteMutation.isPending;

    // In edit mode, we use BOTH server variants AND any new pending rows (not yet saved)
    // because new rows shouldn't save until user fills in size/color.
    const serverRows: VariantFormValue[] = serverVariants.map((v) => ({
        id: v.id,
        isExisting: true,
        variantSku: v.variantSku,
        size: v.size ?? '',
        color: v.color ?? '',
        colorHex: v.colorHex ?? '#000000',
        quantityInStock: v.quantityInStock,
        priceOverride: v.priceOverride,
    }));

    // Filter out any pending rows that have an id matching a server variant
    // (shouldn't happen, but just in case)
    const newPendingRows = pendingVariants.filter(
        (p) => !serverRows.some((s) => s.id === p.id),
    );

    // Combined rows shown in the table
    const rows: VariantFormValue[] = isCreateMode
        ? pendingVariants
        : [...serverRows, ...newPendingRows];

    /**
     * Add a new pending row — stays in local state until user fills it in.
     */
    function handleAddRow() {
        const newRow: VariantFormValue = {
            id: `pending-${Date.now()}`,
            isExisting: false,
            variantSku: generateVariantSku(productSku, '', '', '#000000'),
            size: '',
            color: '',
            colorHex: '#000000',
            quantityInStock: 0,
            priceOverride: null,
        };
        onPendingChange([...pendingVariants, newRow]);
    }

    /**
     * Update a row's field locally.
     * For pending rows: just update state.
     * For server rows: just update local UI; the actual save happens on blur.
     */
    function handleRowChange(
        rowId: string,
        field: keyof VariantFormValue,
        value: string | number | null,
    ) {
        // Is this a pending row?
        const isPending = pendingVariants.some((p) => p.id === rowId);

        if (isPending) {
            const updated = pendingVariants.map((v) => {
                if (v.id !== rowId) return v;
                const next = { ...v, [field]: value };
                // Auto-regenerate SKU when size/color/hex changes
                if (field === 'size' || field === 'color' || field === 'colorHex') {
                    next.variantSku = generateVariantSku(
                        productSku,
                        field === 'size' ? String(value) : v.size,
                        field === 'color' ? String(value) : v.color,
                        field === 'colorHex' ? String(value) : v.colorHex,
                    );
                }
                return next;
            });
            onPendingChange(updated);
            return;
        }

        // Server row in edit mode — track changes locally via pendingChanges
        // For simplicity, we don't show optimistic updates yet. The blur handler
        // reads the input's current value directly via the row passed to it.
        // For now, no-op — the input is uncontrolled-ish (we re-derive from server data)
    }

    /**
     * Called when a row loses focus.
     * - Pending row with size/color filled in → create on server, remove from pending
     * - Existing server row with changes → patch on server
     * - Pending row still empty → keep as pending (do nothing)
     */
    async function handleRowBlur(row: VariantFormValue) {
        const isPending = pendingVariants.some((p) => p.id === row.id);

        if (isPending && !isCreateMode && productId) {
            // Edit mode: try to save this pending row IF it has size or color
            const hasSizeOrColor = row.size.trim() !== '' || row.color.trim() !== '';
            if (!hasSizeOrColor) return; // still empty, leave as pending

            if (!row.variantSku.trim()) {
                toast({
                    title: t('common.toast.error'),
                    description: t('product.variant.skuRequired'),
                    variant: 'destructive',
                });
                return;
            }

            try {
                await createMutation.mutateAsync({
                    productId,
                    variantSku: row.variantSku,
                    size: row.size || undefined,
                    color: row.color || undefined,
                    colorHex: row.colorHex || undefined,
                    quantityInStock: row.quantityInStock,
                    priceOverride: row.priceOverride ?? undefined,
                });
                // Remove from pending — server data will refresh and show the new variant
                onPendingChange(pendingVariants.filter((p) => p.id !== row.id));
                toast({
                    title: t('product.variant.created'),
                    variant: 'success',
                });
            } catch (error) {
                toast({
                    title: t('common.toast.error'),
                    description: getErrorMessage(error),
                    variant: 'destructive',
                });
            }
            return;
        }

        // Existing server row — update on server if it changed
        if (!isPending && !isCreateMode && productId && row.isExisting) {
            const original = serverVariants.find((v) => v.id === row.id);
            if (!original) return;

            const changes: Record<string, string | number | null> = {};
            if (row.variantSku !== original.variantSku)
                changes.variantSku = row.variantSku;
            if (row.size !== (original.size ?? ''))
                changes.size = row.size || null;
            if (row.color !== (original.color ?? ''))
                changes.color = row.color || null;
            if (row.colorHex !== (original.colorHex ?? '#000000'))
                changes.colorHex = row.colorHex || null;
            if (row.quantityInStock !== original.quantityInStock)
                changes.quantityInStock = row.quantityInStock;
            if (row.priceOverride !== original.priceOverride)
                changes.priceOverride = row.priceOverride;

            if (Object.keys(changes).length === 0) return;

            try {
                await updateMutation.mutateAsync({
                    id: row.id,
                    productId,
                    payload: changes,
                });
            } catch (error) {
                toast({
                    title: t('common.toast.error'),
                    description: getErrorMessage(error),
                    variant: 'destructive',
                });
            }
        }
    }

    /**
     * Remove a row.
     */
    async function handleRowRemove(rowId: string) {
        const isPending = pendingVariants.some((p) => p.id === rowId);

        if (isPending) {
            // Just remove from local state — never made it to the server
            onPendingChange(pendingVariants.filter((v) => v.id !== rowId));
            return;
        }

        // Server-side delete
        if (!productId) return;
        try {
            await deleteMutation.mutateAsync({ id: rowId, productId });
            toast({
                title: t('product.variant.deleted'),
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
     * Toggle "has variants" on/off.
     */
    function handleToggle(checked: boolean) {
        onHasVariantsChange(checked);
        if (checked && isCreateMode && pendingVariants.length === 0) {
            handleAddRow();
        }
        if (!checked && isCreateMode) {
            onPendingChange([]);
        }
    }

    return (
        <div className="space-y-4">
            {/* Toggle */}
            <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                    checked={hasVariants}
                    onCheckedChange={(v) => handleToggle(v === true)}
                    className="mt-0.5"
                />
                <div className="flex-1">
                    <div className="text-sm font-medium">
                        {t('product.variant.toggle')}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('product.variant.toggleHelp')}
                    </p>
                </div>
            </label>

            {/* Single-variant mode */}
            {!hasVariants && (
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                        <label
                            htmlFor="single-stock"
                            className="text-sm font-medium text-foreground"
                        >
                            {t('product.variant.singleStock')}
                        </label>
                        <Input
                            id="single-stock"
                            type="number"
                            min={0}
                            value={singleStock}
                            onChange={(e) =>
                                onSingleStockChange(
                                    e.target.value === '' ? 0 : Number(e.target.value),
                                )
                            }
                            className="h-9 w-32 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                        />
                        <span className="text-xs text-muted-foreground">
              {t('product.variant.singleStockHelp')}
            </span>
                    </div>
                </div>
            )}

            {/* Multi-variant mode */}
            {hasVariants && (
                <div className="overflow-x-auto rounded-lg border border-border/60">
                    <table className="w-full text-sm">
                        <thead className="border-b bg-muted/30">
                        <tr className="text-left">
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.size')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.color')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.sku')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.stock')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.priceOverride')}
                            </th>
                            <th className="w-12 px-3 py-2"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                                >
                                    {t('product.variant.empty')}
                                </td>
                            </tr>
                        ) : (
                            rows.map((row) => {
                                const isPending = pendingVariants.some(
                                    (p) => p.id === row.id,
                                );
                                return (
                                    <VariantRow
                                        key={row.id}
                                        row={row}
                                        isPending={isPending}
                                        disabled={isMutating}
                                        onChange={(field, value) =>
                                            handleRowChange(row.id, field, value)
                                        }
                                        onBlur={() => void handleRowBlur(row)}
                                        onRemove={() => void handleRowRemove(row.id)}
                                    />
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add button */}
            {hasVariants && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    disabled={isMutating}
                    className="w-full border-dashed sm:w-auto"
                >
                    <Plus className="mr-1.5 size-4" />
                    {t('product.variant.add')}
                </Button>
            )}
        </div>
    );
}

/**
 * Single row in the variants table.
 */
function VariantRow({
                        row,
                        isPending,
                        disabled,
                        onChange,
                        onBlur,
                        onRemove,
                    }: {
    row: VariantFormValue;
    isPending: boolean;
    disabled?: boolean;
    onChange: (
        field: keyof VariantFormValue,
        value: string | number | null,
    ) => void;
    onBlur: () => void;
    onRemove: () => void;
}) {
    return (
        <tr className={isPending ? 'bg-amber-50/30 dark:bg-amber-500/5' : 'bg-card'}>
            {/* Size */}
            <td className="px-3 py-2">
                <Input
                    type="text"
                    value={row.size}
                    onChange={(e) => onChange('size', e.target.value)}
                    onBlur={onBlur}
                    placeholder="S / M / L"
                    disabled={disabled}
                    className="h-9 w-24 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>

            {/* Color */}
            <td className="px-3 py-2">
                <div className="min-w-45">
                    <ColorPickerInput
                        colorName={row.color}
                        colorHex={row.colorHex}
                        onColorNameChange={(v) => onChange('color', v)}
                        onColorHexChange={(v) => onChange('colorHex', v)}
                        disabled={disabled}
                    />
                </div>
            </td>

            {/* SKU */}
            <td className="px-3 py-2">
                <Input
                    type="text"
                    value={row.variantSku}
                    onChange={(e) => onChange('variantSku', e.target.value)}
                    onBlur={onBlur}
                    placeholder="GUC-BAG-001-SM-BLK"
                    disabled={disabled}
                    className="h-9 w-40 rounded-md font-mono text-xs shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>

            {/* Stock */}
            <td className="px-3 py-2">
                <Input
                    type="number"
                    min={0}
                    value={row.quantityInStock}
                    onChange={(e) =>
                        onChange(
                            'quantityInStock',
                            e.target.value === '' ? 0 : Number(e.target.value),
                        )
                    }
                    onBlur={onBlur}
                    disabled={disabled}
                    className="h-9 w-20 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>

            {/* Price override */}
            <td className="px-3 py-2">
                <div className="relative w-28">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            $
          </span>
                    <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={row.priceOverride ?? ''}
                        onChange={(e) =>
                            onChange(
                                'priceOverride',
                                e.target.value === '' ? null : Number(e.target.value),
                            )
                        }
                        onBlur={onBlur}
                        placeholder="—"
                        disabled={disabled}
                        className="h-9 rounded-md pl-6 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                    />
                </div>
            </td>

            {/* Remove */}
            <td className="px-3 py-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    disabled={disabled}
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                >
                    <Trash2 className="size-4" />
                </Button>
            </td>
        </tr>
    );
}