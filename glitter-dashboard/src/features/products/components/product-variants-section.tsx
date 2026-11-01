'use client';

import { Plus, Trash2, Wand2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useColors } from '@/features/colors/use-colors';
import { useI18n } from '@/lib/i18n';
import { generateVariantSku } from '@/lib/sku-generator';
import { cn } from '@/lib/utils';
import type { Color } from '@/types/color';
import type { VariantEditorState, VariantRow } from '@/types/product';
import type { VariantStockEntry } from '@/features/inventory-branch/components/variant-stock-dialog';
import { VariantStockMatrix } from '@/features/products/components/variant-stock-matrix';

interface ProductVariantsSectionProps {
    productSku: string;
    productPrice: number;
    /** "Price before discount" (0 = none): a colour can't cost more. */
    productOriginalPrice?: number;
    /** Make `price` the product's selling price and clear per-variant prices. */
    onSetPriceForAll?: (price: number) => void;
    state: VariantEditorState;
    onChange: (state: VariantEditorState) => void;
    hasVariants: boolean;
    onHasVariantsChange: (hasVariants: boolean) => void;
    /** Stock row id used when the product has no variants. */
    defaultRowId: string;
    /** Saved stock per row per branch (edit mode). */
    initialStock: Map<string, Map<string, number>>;
    pendingStockChanges: Map<string, VariantStockEntry[]>;
    onStockChange: (variantId: string, entries: VariantStockEntry[]) => void;
}

const ROW_KEY = (size: string, hex: string) =>
    `${size.trim().toLowerCase()}|||${hex.toLowerCase()}`;

export function ProductVariantsSection({
    productSku,
    productPrice,
    productOriginalPrice = 0,
    onSetPriceForAll,
    state,
    onChange,
    hasVariants,
    onHasVariantsChange,
    defaultRowId,
    initialStock,
    pendingStockChanges,
    onStockChange,
}: ProductVariantsSectionProps) {
    const { t, language } = useI18n();
    const { data: colors = [] } = useColors();

    // Builder selections (for generating new variants)
    const [sizeInput, setSizeInput] = useState('');
    const [sizes, setSizes] = useState<string[]>([]);
    const [pickedColorIds, setPickedColorIds] = useState<string[]>([]);
    // Quick fill: one price for every variant (like the stock "fill" helper).
    const [fillPrice, setFillPrice] = useState<number | ''>('');

    // Allowed range for a colour's own price.
    const minPrice = productPrice;
    const maxPrice = productOriginalPrice > 0 ? productOriginalPrice : null;
    function rangeError(p: number): string | null {
        if (p < minPrice)
            return t('product.variant.belowSelling').replace(
                '{price}',
                minPrice.toFixed(2),
            );
        if (maxPrice !== null && p > maxPrice)
            return t('product.variant.aboveBefore').replace(
                '{price}',
                maxPrice.toFixed(2),
            );
        return null;
    }
    // "Same price for all" sets the selling price, so it can't be above the
    // "before discount" price.
    const fillError =
        fillPrice !== '' && maxPrice !== null && fillPrice > maxPrice
            ? t('product.variant.aboveBefore').replace(
                  '{price}',
                  maxPrice.toFixed(2),
              )
            : null;

    function applyPriceToAll(price: number | null) {
        // One price for everything = the product's selling price; variants
        // then simply follow it (no per-variant override to keep in sync).
        if (price !== null && onSetPriceForAll) {
            onSetPriceForAll(price);
            setFillPrice('');
            return;
        }
        onChange({
            ...state,
            rows: state.rows.map((r) => ({ ...r, priceOverride: price })),
        });
    }

    function addSize() {
        const v = sizeInput.trim();
        if (v && !sizes.includes(v)) setSizes((s) => [...s, v]);
        setSizeInput('');
    }
    function togglePicked(id: string) {
        setPickedColorIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    function generate() {
        const existing = new Set(
            state.rows.map((r) => ROW_KEY(r.size, r.colorHex)),
        );
        const sizeList = sizes.length ? sizes : [''];
        const colorList: Array<{ name: string; hex: string }> =
            pickedColorIds.length
                ? colors
                      .filter((c) => pickedColorIds.includes(c.id))
                      .map((c) => ({ name: c.nameEn, hex: c.hex }))
                : [{ name: '', hex: '#000000' }];

        const newRows: VariantRow[] = [];
        let i = 0;
        for (const size of sizeList) {
            for (const color of colorList) {
                const key = ROW_KEY(size, color.hex);
                if (existing.has(key)) continue;
                existing.add(key);
                newRows.push({
                    id: `new-${Date.now()}-${i++}`,
                    isExisting: false,
                    size,
                    color: color.name,
                    colorHex: color.hex,
                    variantSku: generateVariantSku(
                        productSku,
                        size,
                        color.name,
                        color.hex,
                    ),
                    quantityInStock: 0,
                    priceOverride: null,
                });
            }
        }
        if (newRows.length > 0) {
            onChange({ ...state, rows: [...state.rows, ...newRows] });
        }
        setSizes([]);
        setPickedColorIds([]);
    }

    function updateRow(rowId: string, patch: Partial<VariantRow>) {
        onChange({
            ...state,
            rows: state.rows.map((r) =>
                r.id === rowId ? { ...r, ...patch } : r,
            ),
        });
    }

    function removeRow(row: VariantRow) {
        onChange({
            rows: state.rows.filter((r) => r.id !== row.id),
            deletedIds: row.isExisting
                ? [...state.deletedIds, row.id]
                : state.deletedIds,
        });
    }

    return (
        <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                    checked={hasVariants}
                    onCheckedChange={(v) => onHasVariantsChange(Boolean(v))}
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

            {!hasVariants && (
                <VariantStockMatrix
                    rows={[{ id: defaultRowId, label: '' }]}
                    initialStock={initialStock}
                    pendingStockChanges={pendingStockChanges}
                    onStockChange={onStockChange}
                />
            )}

            {hasVariants && (
                <>
                    {/* Builder: sizes + colors → generate matrix */}
                    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                {t('product.variant.sizesLabel')}
                            </label>
                            <div className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-2 py-1.5 transition-colors focus-within:border-pink-500 dark:focus-within:border-pink-800">
                                {sizes.map((s) => (
                                    <span
                                        key={s}
                                        className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
                                    >
                                        {s}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSizes((x) =>
                                                    x.filter((v) => v !== s),
                                                )
                                            }
                                            className="cursor-pointer"
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    value={sizeInput}
                                    onChange={(e) =>
                                        setSizeInput(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addSize();
                                        }
                                    }}
                                    onBlur={addSize}
                                    placeholder={
                                        sizes.length === 0
                                            ? t(
                                                  'product.variant.sizesPlaceholder',
                                              )
                                            : ''
                                    }
                                    className="h-7 min-w-25 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                                {t('product.variant.colorsLabel')}
                            </label>
                            {colors.length === 0 ? (
                                <p className="text-xs text-muted-foreground">
                                    {t('product.variant.noColors')}
                                </p>
                            ) : (
                                <div className="flex flex-wrap gap-1.5">
                                    {colors.map((c: Color) => {
                                        const on = pickedColorIds.includes(
                                            c.id,
                                        );
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() =>
                                                    togglePicked(c.id)
                                                }
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors',
                                                    on
                                                        ? 'border-pink-400 bg-pink-50 text-pink-700 dark:border-pink-600 dark:bg-pink-500/15 dark:text-pink-300'
                                                        : 'border-input hover:bg-accent',
                                                )}
                                            >
                                                <span
                                                    className="size-3.5 rounded-full border border-border/60"
                                                    style={{
                                                        backgroundColor: c.hex,
                                                    }}
                                                />
                                                {language === 'km'
                                                    ? c.nameKm
                                                    : c.nameEn}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <Button
                            type="button"
                            size="sm"
                            onClick={generate}
                            disabled={
                                sizes.length === 0 &&
                                pickedColorIds.length === 0
                            }
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            <Plus className="size-4" />
                            {t('product.variant.generate')}
                        </Button>
                    </div>

                    {/* Quick price fill for every variant */}
                    {state.rows.length > 1 && (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                            <Wand2 className="size-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                                {t('product.variant.fillPrice')}
                            </span>
                            <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                    $
                                </span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={fillPrice}
                                    onChange={(e) =>
                                        setFillPrice(
                                            e.target.value === ''
                                                ? ''
                                                : Number(e.target.value),
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (fillPrice !== '' && !fillError)
                                                applyPriceToAll(fillPrice);
                                        }
                                    }}
                                    aria-invalid={fillError ? true : undefined}
                                    placeholder={productPrice.toFixed(2)}
                                    className="h-8 w-28 pl-6"
                                />
                            </div>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={fillPrice === '' || Boolean(fillError)}
                                onClick={() =>
                                    fillPrice !== '' &&
                                    applyPriceToAll(fillPrice)
                                }
                                className="h-8"
                            >
                                {t('product.stock.apply')}
                            </Button>
                            {state.rows.some(
                                (r) => r.priceOverride !== null,
                            ) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        applyPriceToAll(null);
                                        setFillPrice('');
                                    }}
                                    className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
                                >
                                    {t('product.variant.useProductPrice')}
                                </button>
                            )}
                            {fillError && (
                                <p className="w-full text-xs text-destructive">
                                    {fillError}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Generated variant list */}
                    {state.rows.length > 0 && (
                        <div className="space-y-2">
                            {state.rows.map((row) => (
                                <div
                                    key={row.id}
                                    className={cn(
                                        'rounded-xl border p-3',
                                        row.isExisting
                                            ? 'bg-card'
                                            : 'bg-amber-50/30 dark:bg-amber-500/5',
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            className="size-5 shrink-0 rounded-full border border-border/60"
                                            style={{
                                                backgroundColor: row.colorHex,
                                            }}
                                        />
                                        <span className="text-sm font-medium">
                                            {[row.size, row.color]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                        <span className="ml-1 truncate font-mono text-[11px] text-muted-foreground">
                                            {row.variantSku}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeRow(row)}
                                            className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>

                                    <div className="mt-2 max-w-60">
                                        <div>
                                            <label className="mb-1 block text-[11px] text-muted-foreground">
                                                {t(
                                                    'product.variant.priceOverrideLabel',
                                                )}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                    $
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={minPrice}
                                                    max={maxPrice ?? undefined}
                                                    aria-invalid={
                                                        row.priceOverride !==
                                                            null &&
                                                        rangeError(
                                                            row.priceOverride,
                                                        )
                                                            ? true
                                                            : undefined
                                                    }
                                                    value={
                                                        row.priceOverride ?? ''
                                                    }
                                                    onChange={(e) =>
                                                        updateRow(row.id, {
                                                            priceOverride:
                                                                e.target
                                                                    .value ===
                                                                ''
                                                                    ? null
                                                                    : Number(
                                                                          e
                                                                              .target
                                                                              .value,
                                                                      ),
                                                        })
                                                    }
                                                    placeholder={productPrice.toFixed(
                                                        2,
                                                    )}
                                                    className="h-9 pl-6"
                                                />
                                            </div>
                                            {row.priceOverride !== null &&
                                                rangeError(
                                                    row.priceOverride,
                                                ) && (
                                                    <p className="mt-1 text-[11px] text-destructive">
                                                        {rangeError(
                                                            row.priceOverride,
                                                        )}
                                                    </p>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {state.rows.length > 0 && (
                        <VariantStockMatrix
                            rows={state.rows.map((r) => ({
                                id: r.id,
                                label:
                                    [r.size, r.color]
                                        .filter(Boolean)
                                        .join(' · ') || r.variantSku,
                                colorHex: r.color ? r.colorHex : undefined,
                            }))}
                            initialStock={initialStock}
                            pendingStockChanges={pendingStockChanges}
                            onStockChange={onStockChange}
                            onRowTotal={(rowId, total) =>
                                updateRow(rowId, { quantityInStock: total })
                            }
                        />
                    )}
                </>
            )}
        </div>
    );
}
