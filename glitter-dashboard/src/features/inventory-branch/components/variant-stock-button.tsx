'use client';

import { Warehouse } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import {
    VariantStockDialog,
    type VariantStockEntry,
} from './variant-stock-dialog';

interface VariantStockButtonProps {
    variantId: string | null;
    variantSku: string;
    variantSize: string | null;
    variantColor: string | null;
    variantColorHex: string | null;
    /** Server-side variant total stock (auto-synced from inventory_branch) */
    totalStock: number;
    isSaved: boolean;
    disabled?: boolean;
    /** Pending stock changes for this variant from the parent's local state */
    pendingEntries: VariantStockEntry[] | null;
    /** Sum of pendingEntries.quantityAvailable, if any — used to display preview */
    pendingTotal: number | null;
    onApply: (entries: VariantStockEntry[]) => void;
}

export function VariantStockButton({
                                       variantId,
                                       variantSku,
                                       variantSize,
                                       variantColor,
                                       variantColorHex,
                                       totalStock,
                                       isSaved,
                                       disabled,
                                       pendingEntries,
                                       pendingTotal,
                                       onApply,
                                   }: VariantStockButtonProps) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);

    // If parent has pending changes, prefer that total
    const displayedStock = pendingTotal !== null ? pendingTotal : totalStock;
    const hasPending = pendingTotal !== null;

    const isOutOfStock = displayedStock === 0;
    const isLowStock = displayedStock > 0 && displayedStock < 10;

    const stockColor = isOutOfStock
        ? 'text-destructive'
        : isLowStock
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-foreground';

    if (!isSaved || !variantId) {
        return (
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="h-9 gap-2 cursor-not-allowed opacity-60"
                title={t('variant.stock.button.saveFirst')}
            >
                <Warehouse className="size-3.5" />
                <span className="font-mono text-sm">0</span>
            </Button>
        );
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(true)}
                disabled={disabled}
                className={`h-9 gap-2 ${
                    hasPending
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-500/10'
                        : 'hover:border-pink-300 hover:bg-pink-50 dark:hover:border-pink-700 dark:hover:bg-pink-500/10'
                }`}
                title={
                    hasPending
                        ? t('variant.stock.button.pending')
                        : t('variant.stock.button.manage')
                }
            >
                <Warehouse
                    className={`size-3.5 ${
                        hasPending
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-pink-500 dark:text-pink-400'
                    }`}
                />
                <span className={`font-mono text-sm font-semibold ${stockColor}`}>
          {displayedStock}
        </span>
                {hasPending && (
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            •
          </span>
                )}
            </Button>

            <VariantStockDialog
                open={open}
                onOpenChange={setOpen}
                variantId={variantId}
                variantSku={variantSku}
                variantSize={variantSize}
                variantColor={variantColor}
                variantColorHex={variantColorHex}
                pendingEntries={pendingEntries}
                onApply={onApply}
            />
        </>
    );
}