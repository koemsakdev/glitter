'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useActiveBranches } from '@/features/branches/use-branches';
import { useVariantInventory } from '@/features/inventory-branch/use-inventory-branch';
import { useI18n } from '@/lib/i18n';
import type { InventoryBranchRecord } from '@/types/inventory-branch';

/**
 * A single per-branch stock entry the parent tracks locally.
 * inventoryId is null for new rows (not yet on server).
 */
export interface VariantStockEntry {
    branchId: string;
    inventoryId: string | null;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
}

interface VariantStockDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variantId: string;
    variantSku: string;
    variantSize: string | null;
    variantColor: string | null;
    variantColorHex: string | null;
    /** Pending (local) entries already in the parent — used to show unsaved changes */
    pendingEntries: VariantStockEntry[] | null;
    /** Called when a user applies — parent stores in a local state, does NOT call API */
    onApply: (entries: VariantStockEntry[]) => void;
}

interface BranchStockState {
    branchId: string;
    branchNameEn: string;
    branchNameKm: string;
    branchCode: string;
    inventoryId: string | null;
    quantityAvailable: number;
    quantityReserved: number;
    quantityDamaged: number;
}

export function VariantStockDialog({
                                       open,
                                       onOpenChange,
                                       variantId,
                                       variantSku,
                                       variantSize,
                                       variantColor,
                                       variantColorHex,
                                       pendingEntries,
                                       onApply,
                                   }: VariantStockDialogProps) {
    const { t, language } = useI18n();

    const { data: branches, isLoading: branchesLoading } = useActiveBranches();
    const { data: inventory, isLoading: inventoryLoading } = useVariantInventory(
        open ? variantId : undefined,
    );

    const [rows, setRows] = useState<BranchStockState[]>([]);
    const [seeded, setSeeded] = useState(false);

    // Seed: if the parent has pending entries, use those; otherwise use server data.
    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSeeded(false);
            return;
        }
        if (seeded || !branches || !inventory) return;

        const inventoryByBranch = new Map<string, InventoryBranchRecord>();
        inventory.forEach((row) => inventoryByBranch.set(row.branchId, row));

        const pendingByBranch = new Map<string, VariantStockEntry>();
        pendingEntries?.forEach((e) => pendingByBranch.set(e.branchId, e));

        const seededRows: BranchStockState[] = branches.map((branch) => {
            // Priority: pending local change > server inventory > zero defaults
            const pending = pendingByBranch.get(branch.id);
            const existing = inventoryByBranch.get(branch.id);

            return {
                branchId: branch.id,
                branchNameEn: branch.branchNameEn,
                branchNameKm: branch.branchNameKm,
                branchCode: branch.branchCode,
                inventoryId: pending?.inventoryId ?? existing?.id ?? null,
                quantityAvailable:
                    pending?.quantityAvailable ?? existing?.quantityAvailable ?? 0,
                quantityReserved:
                    pending?.quantityReserved ?? existing?.quantityReserved ?? 0,
                quantityDamaged:
                    pending?.quantityDamaged ?? existing?.quantityDamaged ?? 0,
            };
        });

        setRows(seededRows);
        setSeeded(true);
    }, [open, branches, inventory, pendingEntries, seeded]);

    function handleFieldChange(
        branchId: string,
        field: 'quantityAvailable' | 'quantityReserved' | 'quantityDamaged',
        value: number,
    ) {
        setRows((prev) =>
            prev.map((r) =>
                r.branchId === branchId ? { ...r, [field]: Math.max(0, value) } : r,
            ),
        );
    }

    function handleApply() {
        // Pass all rows up — parent decides what's a meaningful change
        const entries: VariantStockEntry[] = rows.map((r) => ({
            branchId: r.branchId,
            inventoryId: r.inventoryId,
            quantityAvailable: r.quantityAvailable,
            quantityReserved: r.quantityReserved,
            quantityDamaged: r.quantityDamaged,
        }));
        onApply(entries);
        onOpenChange(false);
    }

    const isLoading = branchesLoading || inventoryLoading;
    const grandTotalAvailable = rows.reduce(
        (sum, r) => sum + r.quantityAvailable,
        0,
    );

    const variantLabel = [variantSize, variantColor].filter(Boolean).join(' · ');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{t('variant.stock.dialog.title')}</DialogTitle>
                    <DialogDescription>
            <span className="inline-flex items-center gap-2">
              {variantColorHex && (
                  <span
                      className="inline-block size-3.5 rounded-full border border-border"
                      style={{ backgroundColor: variantColorHex }}
                  />
              )}
                {variantLabel || t('variant.stock.dialog.noVariantInfo')}
                <span className="font-mono text-xs text-muted-foreground">
                ({variantSku})
              </span>
            </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="size-6 animate-spin rounded-full border-2 border-pink-400 border-t-transparent" />
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="py-8 text-center text-sm italic text-muted-foreground">
                            {t('variant.stock.dialog.noBranches')}
                        </p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-border/60">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-muted/30">
                                    <tr className="text-left">
                                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            {t('variant.stock.dialog.col.branch')}
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            {t('variant.stock.dialog.col.available')}
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            {t('variant.stock.dialog.col.reserved')}
                                        </th>
                                        <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            {t('variant.stock.dialog.col.damaged')}
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                    {rows.map((row) => (
                                        <BranchStockRow
                                            key={row.branchId}
                                            row={row}
                                            language={language}
                                            onFieldChange={handleFieldChange}
                                        />
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  {t('variant.stock.dialog.totalAvailable')}
                </span>
                                <span className="font-mono text-lg font-bold text-pink-600 dark:text-pink-300">
                  {grandTotalAvailable}
                </span>
                            </div>

                            <p className="text-xs italic text-muted-foreground">
                                {t('variant.stock.dialog.deferredHint')}
                            </p>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleApply}
                        disabled={isLoading || rows.length === 0}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {t('variant.stock.dialog.apply')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function BranchStockRow({
                            row,
                            language,
                            onFieldChange,
                        }: {
    row: BranchStockState;
    language: 'en' | 'km';
    onFieldChange: (
        branchId: string,
        field: 'quantityAvailable' | 'quantityReserved' | 'quantityDamaged',
        value: number,
    ) => void;
}) {
    const name = language === 'km' ? row.branchNameKm : row.branchNameEn;
    const isNew = row.inventoryId === null;

    return (
        <tr className={isNew ? 'bg-amber-50/30 dark:bg-amber-500/5' : 'bg-card'}>
            <td className="px-3 py-2.5">
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">
            {row.branchCode}
                        {isNew && (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">
                · new
              </span>
                        )}
          </span>
                </div>
            </td>
            <td className="px-3 py-2">
                <Input
                    type="number"
                    min={0}
                    value={row.quantityAvailable}
                    onChange={(e) =>
                        onFieldChange(
                            row.branchId,
                            'quantityAvailable',
                            e.target.value === '' ? 0 : Number(e.target.value),
                        )
                    }
                    className="h-9 w-24 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>
            <td className="px-3 py-2">
                <Input
                    type="number"
                    min={0}
                    value={row.quantityReserved}
                    onChange={(e) =>
                        onFieldChange(
                            row.branchId,
                            'quantityReserved',
                            e.target.value === '' ? 0 : Number(e.target.value),
                        )
                    }
                    className="h-9 w-24 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>
            <td className="px-3 py-2">
                <Input
                    type="number"
                    min={0}
                    value={row.quantityDamaged}
                    onChange={(e) =>
                        onFieldChange(
                            row.branchId,
                            'quantityDamaged',
                            e.target.value === '' ? 0 : Number(e.target.value),
                        )
                    }
                    className="h-9 w-24 rounded-md shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-800"
                />
            </td>
        </tr>
    );
}