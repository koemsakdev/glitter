'use client';

import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorPickerInput } from '@/components/ui/color-picker-input';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { generateVariantSku } from '@/lib/sku-generator';
import type { VariantEditorState, VariantRow } from '@/types/product';
import { VariantStockButton } from '@/features/inventory-branch/components/variant-stock-button';
import type { VariantStockEntry } from '@/features/inventory-branch/components/variant-stock-dialog';

interface ProductVariantsSectionProps {
    productSku: string;
    state: VariantEditorState;
    onChange: (state: VariantEditorState) => void;
    hasVariants: boolean;
    onHasVariantsChange: (hasVariants: boolean) => void;
    singleStock: number;
    onSingleStockChange: (stock: number) => void;

    pendingStockChanges: Map<string, VariantStockEntry[]>;
    onStockChange: (variantId: string, entries: VariantStockEntry[]) => void;
}

export function ProductVariantsSection({
   productSku,
   state,
   onChange,
   hasVariants,
   onHasVariantsChange,
   singleStock,
   onSingleStockChange,
   pendingStockChanges,
   onStockChange,
}: ProductVariantsSectionProps) {
    const { t } = useI18n();

    function applyFieldChange(
        row: VariantRow,
        field: keyof VariantRow,
        value: string | number | null,
    ): VariantRow {
        const next = { ...row, [field]: value };
        if (field === 'size' || field === 'color' || field === 'colorHex') {
            next.variantSku = generateVariantSku(
                productSku,
                field === 'size' ? String(value) : row.size,
                field === 'color' ? String(value) : row.color,
                field === 'colorHex' ? String(value) : row.colorHex,
            );
        }
        return next;
    }

    function applyColorPick(
        row: VariantRow,
        hex: string,
        autoFillName: boolean,
    ): VariantRow {
        const color = autoFillName ? hex : row.color;
        return {
            ...row,
            colorHex: hex,
            color,
            variantSku: generateVariantSku(productSku, row.size, color, hex),
        };
    }

    function handleFieldChange(
        rowId: string,
        field: keyof VariantRow,
        value: string | number | null,
    ) {
        onChange({
            ...state,
            rows: state.rows.map((r) =>
                r.id === rowId ? applyFieldChange(r, field, value) : r,
            ),
        });
    }

    function handleColorPick(rowId: string, hex: string, autoFillName: boolean) {
        onChange({
            ...state,
            rows: state.rows.map((r) =>
                r.id === rowId ? applyColorPick(r, hex, autoFillName) : r,
            ),
        });
    }

    function handleAddRow() {
        const newRow: VariantRow = {
            id: `new-${Date.now()}`,
            isExisting: false,
            variantSku: generateVariantSku(productSku, '', '', '#000000'),
            size: '',
            color: '',
            colorHex: '#000000',
            quantityInStock: 0,
            priceOverride: null,
        };
        onChange({ ...state, rows: [...state.rows, newRow] });
    }

    function handleRemove(row: VariantRow) {
        const rows = state.rows.filter((r) => r.id !== row.id);
        const deletedIds = row.isExisting
            ? [...state.deletedIds, row.id]
            : state.deletedIds;
        onChange({ rows, deletedIds });
    }

    function handleToggle(checked: boolean) {
        onHasVariantsChange(checked);
        if (checked && state.rows.length === 0) {
            handleAddRow();
        }
    }

    return (
        <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                    checked={hasVariants}
                    onCheckedChange={(v) => handleToggle(v)}
                    className="mt-0.5"
                />
                <div className="flex-1">
                    <div className="text-sm font-medium">{t('product.variant.toggle')}</div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('product.variant.toggleHelp')}
                    </p>
                </div>
            </label>

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
                                {t('product.variant.col.totalStock')}
                            </th>
                            <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                {t('product.variant.col.priceOverride')}
                            </th>
                            <th className="w-12 px-3 py-2"></th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {state.rows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-3 py-6 text-center text-sm text-muted-foreground"
                                    >
                                        {t('product.variant.empty')}
                                    </td>
                                </tr>
                            ) : (
                                state.rows.map((row) => (
                                    <VariantRowEditor
                                        key={row.id}
                                        row={row}
                                        pendingStockEntries={pendingStockChanges.get(row.id) ?? null}
                                        onFieldChange={(field, value) =>
                                            handleFieldChange(row.id, field, value)
                                        }
                                        onColorPick={(hex, autoFill) =>
                                            handleColorPick(row.id, hex, autoFill)
                                        }
                                        onPendingStockChange={(entries) =>
                                            onStockChange(row.id, entries)
                                        }
                                        onRemove={() => void handleRemove(row)}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {hasVariants && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddRow}
                    className="w-full border-dashed sm:w-auto"
                >
                    <Plus className="mr-1.5 size-4" />
                    {t('product.variant.add')}
                </Button>
            )}
        </div>
    );
}

const VariantRowEditor = React.memo(function VariantRowEditor({
                                                                  row,
                                                                  pendingStockEntries,
                                                                  onFieldChange,
                                                                  onColorPick,
                                                                  onPendingStockChange,
                                                                  onRemove,
                                                              }: {
    row: VariantRow;
    pendingStockEntries: VariantStockEntry[] | null;
    onFieldChange: (field: keyof VariantRow, value: string | number | null) => void;
    onColorPick: (hex: string, autoFillName: boolean) => void;
    onPendingStockChange: (entries: VariantStockEntry[]) => void;
    onRemove: () => void;
}) {
    return (
        <tr className={row.isExisting ? 'bg-card' : 'bg-amber-50/30 dark:bg-amber-500/5'}>
            <td className="px-3 py-2">
                <Input
                    type="text"
                    value={row.size}
                    onChange={(e) => onFieldChange('size', e.target.value)}
                    placeholder="S / M / L"
                    className="h-9 w-24 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>
            <td className="px-3 py-2">
                <div className="min-w-45">
                    <ColorPickerInput
                        colorName={row.color}
                        colorHex={row.colorHex}
                        onColorNameChange={(v) => onFieldChange('color', v)}
                        onColorPick={onColorPick}
                    />
                </div>
            </td>
            <td className="px-3 py-2">
                <Input
                    type="text"
                    value={row.variantSku}
                    onChange={(e) => onFieldChange('variantSku', e.target.value)}
                    placeholder="GUC-BAG-001-SM-BLK"
                    className="h-9 w-40 rounded-md font-mono text-xs shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>
            <td className="px-3 py-2">
                <VariantStockButton
                    variantId={row.id}
                    variantSku={row.variantSku}
                    variantSize={row.size || null}
                    variantColor={row.color || null}
                    variantColorHex={row.colorHex}
                    totalStock={row.quantityInStock}
                    isSaved={row.isExisting}
                    disabled={false}
                    pendingEntries={pendingStockEntries}
                    pendingTotal={
                        pendingStockEntries
                            ? pendingStockEntries.reduce(
                                (sum, e) => sum + e.quantityAvailable,
                                0,
                            )
                            : null
                    }
                    onApply={onPendingStockChange}
                />
            </td>
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
                            onFieldChange(
                                'priceOverride',
                                e.target.value === '' ? null : Number(e.target.value),
                            )
                        }
                        placeholder="—"
                        className="h-9 rounded-md pl-6 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                    />
                </div>
            </td>
            <td className="px-3 py-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Remove"
                >
                    <Trash2 className="size-4" />
                </Button>
            </td>
        </tr>
    );
});