'use client';

import { Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useColors } from '@/features/colors/use-colors';
import { useBranches } from '@/features/branches/use-branches';
import { useSelectedBranchId } from '@/stores/use-branch-context';
import { useI18n } from '@/lib/i18n';
import { generateVariantSku } from '@/lib/sku-generator';
import { cn } from '@/lib/utils';
import type { Color } from '@/types/color';
import type { VariantEditorState, VariantRow } from '@/types/product';
import type { VariantStockEntry } from '@/features/inventory-branch/components/variant-stock-dialog';

interface ProductVariantsSectionProps {
    productSku: string;
    productPrice: number;
    state: VariantEditorState;
    onChange: (state: VariantEditorState) => void;
    hasVariants: boolean;
    onHasVariantsChange: (hasVariants: boolean) => void;
    singleStock: number;
    onSingleStockChange: (stock: number) => void;
    pendingStockChanges: Map<string, VariantStockEntry[]>;
    onStockChange: (variantId: string, entries: VariantStockEntry[]) => void;
}

const ROW_KEY = (size: string, hex: string) =>
    `${size.trim().toLowerCase()}|||${hex.toLowerCase()}`;

export function ProductVariantsSection({
    productSku,
    productPrice,
    state,
    onChange,
    hasVariants,
    onHasVariantsChange,
    singleStock,
    onSingleStockChange,
    pendingStockChanges,
    onStockChange,
}: ProductVariantsSectionProps) {
    const { t, language } = useI18n();
    const { data: colors = [] } = useColors();
    const { data: branchData } = useBranches({ page: 1, limit: 100 });
    const branches = branchData?.data ?? [];
    const selectedBranchId = useSelectedBranchId(); // null = "All branches"

    // Builder selections (for generating new variants)
    const [sizeInput, setSizeInput] = useState('');
    const [sizes, setSizes] = useState<string[]>([]);
    const [pickedColorIds, setPickedColorIds] = useState<string[]>([]);

    const branchName = (id: string) => {
        const b = branches.find((x) => x.id === id);
        return b ? (language === 'km' ? b.branchNameKm : b.branchNameEn) : id;
    };

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

    /** Set stock for a single branch on a row (updates total + pending entries). */
    function setBranchStock(row: VariantRow, branchId: string, qty: number) {
        const prev = pendingStockChanges.get(row.id) ?? [];
        const others = prev.filter((e) => e.branchId !== branchId);
        const existing = prev.find((e) => e.branchId === branchId);
        const next: VariantStockEntry[] = [
            ...others,
            {
                branchId,
                inventoryId: existing?.inventoryId ?? null,
                quantityAvailable: qty,
                quantityReserved: 0,
                quantityDamaged: 0,
            },
        ];
        onStockChange(row.id, next);
        const total = next.reduce((s, e) => s + e.quantityAvailable, 0);
        updateRow(row.id, { quantityInStock: total });
    }

    function branchQty(row: VariantRow, branchId: string): number {
        const entry = pendingStockChanges
            .get(row.id)
            ?.find((e) => e.branchId === branchId);
        if (entry) return entry.quantityAvailable;
        // No pending edit yet: existing single-branch variants show their total.
        return selectedBranchId ? row.quantityInStock : 0;
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
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <label
                            htmlFor="single-stock"
                            className="text-sm font-medium"
                        >
                            {t('product.variant.singleStock')}
                            {selectedBranchId && (
                                <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    · {branchName(selectedBranchId)}
                                </span>
                            )}
                        </label>
                        <Input
                            id="single-stock"
                            type="number"
                            min={0}
                            value={singleStock}
                            onChange={(e) =>
                                onSingleStockChange(
                                    e.target.value === ''
                                        ? 0
                                        : Number(e.target.value),
                                )
                            }
                            className="h-9 w-32"
                        />
                    </div>
                </div>
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
                                    onChange={(e) => setSizeInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addSize();
                                        }
                                    }}
                                    onBlur={addSize}
                                    placeholder={
                                        sizes.length === 0
                                            ? t('product.variant.sizesPlaceholder')
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
                                        const on = pickedColorIds.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => togglePicked(c.id)}
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
                            disabled={sizes.length === 0 && pickedColorIds.length === 0}
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            <Plus className="size-4" />
                            {t('product.variant.generate')}
                        </Button>
                    </div>

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
                                                .join(' · ') || '—'}
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

                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-[11px] text-muted-foreground">
                                                {t('product.variant.priceOverrideLabel')}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                    $
                                                </span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    value={row.priceOverride ?? ''}
                                                    onChange={(e) =>
                                                        updateRow(row.id, {
                                                            priceOverride:
                                                                e.target.value ===
                                                                ''
                                                                    ? null
                                                                    : Number(
                                                                          e.target
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
                                        </div>

                                        {selectedBranchId ? (
                                            <div>
                                                <label className="mb-1 block text-[11px] text-muted-foreground">
                                                    {t('product.variant.stockAt')}{' '}
                                                    {branchName(selectedBranchId)}
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    value={branchQty(
                                                        row,
                                                        selectedBranchId,
                                                    )}
                                                    onChange={(e) =>
                                                        setBranchStock(
                                                            row,
                                                            selectedBranchId,
                                                            e.target.value === ''
                                                                ? 0
                                                                : Number(
                                                                      e.target
                                                                          .value,
                                                                  ),
                                                        )
                                                    }
                                                    className="h-9"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="mb-1 block text-[11px] text-muted-foreground">
                                                    {t('product.variant.stockPerBranch')}
                                                </label>
                                                <div className="space-y-1.5">
                                                    {branches.map((b) => (
                                                        <div
                                                            key={b.id}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <span className="w-24 truncate text-xs text-muted-foreground">
                                                                {language === 'km'
                                                                    ? b.branchNameKm
                                                                    : b.branchNameEn}
                                                            </span>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={branchQty(
                                                                    row,
                                                                    b.id,
                                                                )}
                                                                onChange={(e) =>
                                                                    setBranchStock(
                                                                        row,
                                                                        b.id,
                                                                        e.target
                                                                            .value ===
                                                                            ''
                                                                            ? 0
                                                                            : Number(
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                              ),
                                                                    )
                                                                }
                                                                className="h-8 flex-1"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
