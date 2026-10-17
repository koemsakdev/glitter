'use client';

import { CopyCheck, MapPin, Store, Wand2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { useActiveBranches } from '@/features/branches/use-branches';
import { useSelectedBranchId } from '@/stores/use-branch-context';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { VariantStockEntry } from '@/features/inventory-branch/components/variant-stock-dialog';

/** One editable stock row: a variant (or the product's single default). */
export interface StockRow {
    id: string;
    label: string;
    colorHex?: string;
}

interface VariantStockMatrixProps {
    rows: StockRow[];
    /** Saved stock: rowId → branchId → quantity (edit mode). */
    initialStock: Map<string, Map<string, number>>;
    pendingStockChanges: Map<string, VariantStockEntry[]>;
    onStockChange: (rowId: string, entries: VariantStockEntry[]) => void;
    /** Called with each row's new total across branches. */
    onRowTotal?: (rowId: string, total: number) => void;
}

/**
 * Stock editor that scales to any number of branches: choose the branches
 * that carry this product (searchable), then fill one compact grid —
 * variants × chosen branches — with quick "fill" helpers instead of typing
 * every cell.
 */
export function VariantStockMatrix({
    rows,
    initialStock,
    pendingStockChanges,
    onStockChange,
    onRowTotal,
}: VariantStockMatrixProps) {
    const { t, language } = useI18n();
    const { data: branches = [] } = useActiveBranches();
    const headerBranchId = useSelectedBranchId();
    const [fillQty, setFillQty] = useState<number | ''>('');

    const name = (id: string) => {
        const b = branches.find((x) => x.id === id);
        if (!b) return '…';
        return language === 'km' ? b.branchNameKm : b.branchNameEn;
    };

    const qty = (rowId: string, branchId: string): number => {
        const pending = pendingStockChanges
            .get(rowId)
            ?.find((e) => e.branchId === branchId);
        if (pending) return pending.quantityAvailable;
        return initialStock.get(rowId)?.get(branchId) ?? 0;
    };

    // Default locations: branches that already hold stock, plus the branch
    // picked in the header; otherwise the primary (first) branch.
    const defaultLocations = useMemo(() => {
        const ids = new Set<string>();
        for (const m of initialStock.values()) {
            for (const [b, q] of m) if (q > 0) ids.add(b);
        }
        for (const entries of pendingStockChanges.values()) {
            for (const e of entries) ids.add(e.branchId);
        }
        if (headerBranchId) ids.add(headerBranchId);
        if (ids.size === 0 && branches[0]) ids.add(branches[0].id);
        return [...ids];
    }, [initialStock, pendingStockChanges, headerBranchId, branches]);

    // null = still following the defaults (until the user edits the list).
    const [picked, setPicked] = useState<string[] | null>(null);
    const locations = picked ?? defaultLocations;

    const options: ComboboxOption[] = branches
        .filter((b) => !locations.includes(b.id))
        .map((b) => ({
            value: b.id,
            label: language === 'km' ? b.branchNameKm : b.branchNameEn,
            secondary: b.branchCode,
        }));

    function setCells(cells: { rowId: string; branchId: string; q: number }[]) {
        const byRow = new Map<string, Map<string, number>>();
        for (const c of cells) {
            if (!byRow.has(c.rowId)) byRow.set(c.rowId, new Map());
            byRow.get(c.rowId)!.set(c.branchId, Math.max(0, c.q));
        }
        for (const [rowId, updates] of byRow) {
            const prev = pendingStockChanges.get(rowId) ?? [];
            const next: VariantStockEntry[] = [
                ...prev.filter((e) => !updates.has(e.branchId)),
                ...[...updates].map(([branchId, q]) => ({
                    branchId,
                    inventoryId:
                        prev.find((e) => e.branchId === branchId)?.inventoryId ??
                        null,
                    quantityAvailable: q,
                    quantityReserved: 0,
                    quantityDamaged: 0,
                })),
            ];
            onStockChange(rowId, next);
            if (onRowTotal) {
                // Total across every branch (edited + untouched saved ones).
                const all = new Set([
                    ...next.map((e) => e.branchId),
                    ...(initialStock.get(rowId)?.keys() ?? []),
                ]);
                let total = 0;
                for (const b of all) {
                    total +=
                        next.find((e) => e.branchId === b)?.quantityAvailable ??
                        initialStock.get(rowId)?.get(b) ??
                        0;
                }
                onRowTotal(rowId, total);
            }
        }
    }

    function removeLocation(branchId: string) {
        // Clear its quantities so removing a branch doesn't leave stock behind.
        const cells = rows
            .filter((r) => qty(r.id, branchId) > 0)
            .map((r) => ({ rowId: r.id, branchId, q: 0 }));
        if (cells.length) setCells(cells);
        setPicked(locations.filter((id) => id !== branchId));
    }

    const rowTotal = (rowId: string) =>
        locations.reduce((s, b) => s + qty(rowId, b), 0);
    const grandTotal = rows.reduce((s, r) => s + rowTotal(r.id), 0);
    const single = rows.length === 1 && locations.length === 1;

    return (
        <div className="space-y-3 rounded-xl border bg-card p-4">
            {/* Locations */}
            <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                        <MapPin className="size-4 text-pink-500" />
                        {t('product.stock.locations')}
                    </span>
                    {branches.length > locations.length && (
                        <button
                            type="button"
                            onClick={() => setPicked(branches.map((b) => b.id))}
                            className="text-xs font-medium text-pink-600 hover:underline dark:text-pink-400"
                        >
                            {t('product.stock.allBranches').replace(
                                '{count}',
                                String(branches.length),
                            )}
                        </button>
                    )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    {locations.map((id) => (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-full bg-pink-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
                        >
                            <Store className="size-3" />
                            {name(id)}
                            {locations.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeLocation(id)}
                                    aria-label={t('product.stock.removeBranch')}
                                    className="rounded-full p-0.5 hover:bg-pink-200 dark:hover:bg-pink-500/25"
                                >
                                    <X className="size-3" />
                                </button>
                            )}
                        </span>
                    ))}
                    {options.length > 0 && (
                        <div className="w-52">
                            <Combobox
                                options={options}
                                value={undefined}
                                onChange={(id) =>
                                    id && setPicked([...locations, id])
                                }
                                placeholder={t('product.stock.addBranch')}
                                searchPlaceholder={t('product.stock.searchBranch')}
                                emptyMessage={t('product.stock.noBranch')}
                                className="h-8 text-xs"
                            />
                        </div>
                    )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                    {t('product.stock.locationsHelp')}
                </p>
            </div>

            {/* Quick fill */}
            {!single && rows.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <Wand2 className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        {t('product.stock.fillAll')}
                    </span>
                    <Input
                        type="number"
                        min={0}
                        value={fillQty}
                        onChange={(e) =>
                            setFillQty(
                                e.target.value === '' ? '' : Number(e.target.value),
                            )
                        }
                        placeholder="0"
                        className="h-8 w-20"
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={fillQty === ''}
                        onClick={() => {
                            if (fillQty === '') return;
                            setCells(
                                rows.flatMap((r) =>
                                    locations.map((b) => ({
                                        rowId: r.id,
                                        branchId: b,
                                        q: fillQty,
                                    })),
                                ),
                            );
                        }}
                        className="h-8"
                    >
                        {t('product.stock.apply')}
                    </Button>
                </div>
            )}

            {/* Grid: rows × chosen branches */}
            {rows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                            <tr>
                                <th className="sticky left-0 z-10 bg-muted/40 px-3 py-2 text-left font-medium backdrop-blur">
                                    {rows.length > 1 || rows[0].label
                                        ? t('product.stock.variant')
                                        : ''}
                                </th>
                                {locations.map((b) => (
                                    <th
                                        key={b}
                                        className="min-w-28 px-2 py-2 text-left font-medium"
                                    >
                                        <span className="block max-w-32 truncate">
                                            {name(b)}
                                        </span>
                                    </th>
                                ))}
                                {locations.length > 1 && (
                                    <th className="px-3 py-2 text-right font-medium">
                                        {t('product.stock.total')}
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id} className="border-t">
                                    <td className="sticky left-0 z-10 bg-card px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            {r.colorHex && (
                                                <span
                                                    className="size-4 shrink-0 rounded-full border border-border/60"
                                                    style={{ backgroundColor: r.colorHex }}
                                                />
                                            )}
                                            <span className="max-w-40 truncate font-medium">
                                                {r.label || t('product.variant.singleStock')}
                                            </span>
                                            {locations.length > 1 && (
                                                <button
                                                    type="button"
                                                    title={t('product.stock.sameForRow')}
                                                    aria-label={t('product.stock.sameForRow')}
                                                    onClick={() => {
                                                        const q = qty(r.id, locations[0]);
                                                        setCells(
                                                            locations.map((b) => ({
                                                                rowId: r.id,
                                                                branchId: b,
                                                                q,
                                                            })),
                                                        );
                                                    }}
                                                    className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                >
                                                    <CopyCheck className="size-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    {locations.map((b) => (
                                        <td key={b} className="px-2 py-1.5">
                                            <Input
                                                type="number"
                                                min={0}
                                                value={qty(r.id, b)}
                                                onChange={(e) =>
                                                    setCells([
                                                        {
                                                            rowId: r.id,
                                                            branchId: b,
                                                            q:
                                                                e.target.value === ''
                                                                    ? 0
                                                                    : Number(e.target.value),
                                                        },
                                                    ])
                                                }
                                                aria-label={`${r.label} · ${name(b)}`}
                                                className="h-8 w-24"
                                            />
                                        </td>
                                    ))}
                                    {locations.length > 1 && (
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                            {rowTotal(r.id)}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        {rows.length > 1 && (
                            <tfoot>
                                <tr className="border-t bg-muted/30 text-xs">
                                    <td className="sticky left-0 z-10 bg-muted/30 px-3 py-2 font-medium text-muted-foreground backdrop-blur">
                                        {t('product.stock.total')}
                                    </td>
                                    {locations.map((b) => (
                                        <td
                                            key={b}
                                            className="px-2 py-2 font-semibold tabular-nums"
                                        >
                                            {rows.reduce((s, r) => s + qty(r.id, b), 0)}
                                        </td>
                                    ))}
                                    {locations.length > 1 && (
                                        <td
                                            className={cn(
                                                'px-3 py-2 text-right font-bold tabular-nums',
                                                grandTotal === 0 && 'text-amber-600',
                                            )}
                                        >
                                            {grandTotal}
                                        </td>
                                    )}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            )}
        </div>
    );
}
