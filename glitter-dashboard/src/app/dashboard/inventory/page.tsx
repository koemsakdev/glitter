'use client';

import { useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Boxes,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Package,
    Pencil,
    Search,
    Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ResponsiveModal } from '@/components/responsive-modal';
import { MarqueeText } from '@/components/ui/marquee-text';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useActiveBranches } from '@/features/branches/use-branches';
import {
    INVENTORY_PAGE_SIZE,
    LOW_STOCK_THRESHOLD,
    useBranchInventory,
    useBranchSummary,
    useSetStock,
    type InventoryProductGroup,
    type InventoryVariantRow,
} from '@/features/inventory/inventory-api';
import { getErrorMessage } from '@/lib/api-client';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

export default function InventoryPage() {
    const { t, language } = useI18n();
    const { data: branches, isLoading: branchesLoading } = useActiveBranches();

    const branchName = (b?: {
        branchNameEn: string;
        branchNameKm: string;
    }) =>
        b ? (language === 'km' ? b.branchNameKm || b.branchNameEn : b.branchNameEn) : '';
    const pName = (p: { nameEn: string; nameKm: string }) =>
        language === 'km' ? p.nameKm || p.nameEn : p.nameEn;
    const [picked, setPicked] = useState<string>('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState<Set<string>>(() => new Set());
    const [adjust, setAdjust] = useState<{
        product: InventoryProductGroup;
        variant: InventoryVariantRow;
    } | null>(null);

    const branchId = picked || branches?.[0]?.id || '';

    // Reset to the first page (and collapse rows) when the branch or search changes.
    useEffect(() => {
        setPage(1);
        setOpen(new Set());
    }, [search, branchId]);

    const { data: inv, isLoading } = useBranchInventory(
        branchId || undefined,
        page,
        search,
    );
    const { data: summary } = useBranchSummary(branchId || undefined);

    function toggle(productId: string) {
        setOpen((prev) => {
            const next = new Set(prev);
            if (next.has(productId)) next.delete(productId);
            else next.add(productId);
            return next;
        });
    }

    const lowCount = useMemo(() => {
        let n = 0;
        for (const p of inv?.data ?? [])
            for (const v of p.variants)
                if (v.quantityAvailable <= LOW_STOCK_THRESHOLD) n++;
        return n;
    }, [inv]);

    if (branchesLoading) return <LoadingScreen variant="page" />;

    if (!branches || branches.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
                <Boxes className="size-10 text-muted-foreground/50" />
                <h1 className="text-lg font-semibold">{t('nav.inventory')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('inventory.noBranch')}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-lg font-semibold">{t('nav.inventory')}</h1>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Branch filter — a single outlined dropdown button */}
                    <Select
                        value={branchId}
                        onValueChange={(v) => v && setPicked(v)}
                    >
                        <SelectTrigger
                            aria-label={t('inventory.selectBranch')}
                            className="h-9 w-52 gap-2 font-medium"
                        >
                            <Store className="size-4 shrink-0 text-pink-500" />
                            <SelectValue className="line-clamp-none! min-w-0">
                                {(v: string) => (
                                    <MarqueeText
                                        text={branchName(
                                            branches.find((b) => b.id === v),
                                        )}
                                    />
                                )}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {branches.map((b) => (
                                <SelectItem key={b.id} value={b.id}>
                                    {branchName(b)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('inventory.search')}
                            className="h-9 w-56 pl-8"
                        />
                    </div>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard
                    icon={Boxes}
                    label={t('inventory.totalVariants')}
                    value={summary?.totalVariants ?? 0}
                />
                <StatCard
                    icon={Package}
                    label={t('inventory.unitsAvailable')}
                    value={summary?.totalUnitsAvailable ?? 0}
                />
                <StatCard
                    icon={Package}
                    label={t('inventory.unitsReserved')}
                    value={summary?.totalUnitsReserved ?? 0}
                />
                <StatCard
                    icon={AlertTriangle}
                    label={t('inventory.lowStockCount')}
                    value={lowCount}
                    warn={lowCount > 0}
                />
            </div>

            {/* Products */}
            {isLoading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-24 animate-pulse rounded-xl border bg-card"
                        />
                    ))}
                </div>
            ) : (inv?.data.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-20 text-center">
                    <Boxes className="size-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                        {t('inventory.empty')}
                    </p>
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <div className="divide-y">
                            {inv!.data.map((product) => {
                                const img = getFileUrl(product.primaryImageUrl);
                                const isOpen = open.has(product.productId);
                                const hasLow = product.variants.some(
                                    (v) =>
                                        v.quantityAvailable <=
                                        LOW_STOCK_THRESHOLD,
                                );
                                return (
                                    <div key={product.productId}>
                                        {/* Compact product row — click to expand variants */}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggle(product.productId)
                                            }
                                            className={`flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                                                isOpen ? 'bg-muted/30' : ''
                                            }`}
                                        >
                                            <ChevronRight
                                                className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                                                    isOpen ? 'rotate-90' : ''
                                                }`}
                                            />
                                            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                                                {img ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={img}
                                                        alt={pName(product)}
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <Package className="size-5 text-muted-foreground/50" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold">
                                                    {pName(product)}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                    <span className="font-mono">
                                                        {product.sku}
                                                    </span>{' '}
                                                    ·{' '}
                                                    {t(
                                                        'inventory.variantsN',
                                                    ).replace(
                                                        '{n}',
                                                        String(
                                                            product.variants
                                                                .length,
                                                        ),
                                                    )}
                                                </p>
                                            </div>
                                            {hasLow && (
                                                <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:inline-flex dark:bg-amber-500/15 dark:text-amber-400">
                                                    <AlertTriangle className="size-3" />
                                                    {t('inventory.lowStock')}
                                                </span>
                                            )}
                                            <div className="shrink-0 text-right">
                                                <p className="text-lg font-extrabold leading-none tabular-nums">
                                                    {product.totalAvailable}
                                                </p>
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                    {t('inventory.available')}
                                                </p>
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="divide-y border-t bg-muted/20">
                                                {product.variants.map((v) => (
                                                    <VariantRow
                                                        key={v.inventoryId}
                                                        variant={v}
                                                        onAdjust={() =>
                                                            setAdjust({
                                                                product,
                                                                variant: v,
                                                            })
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pagination */}
                    {(() => {
                        const total = inv?.total ?? 0;
                        const totalPages = Math.max(
                            1,
                            Math.ceil(total / INVENTORY_PAGE_SIZE),
                        );
                        if (totalPages <= 1) return null;
                        const from = (page - 1) * INVENTORY_PAGE_SIZE + 1;
                        const to = Math.min(page * INVENTORY_PAGE_SIZE, total);
                        return (
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-muted-foreground">
                                    {t('inventory.showing')
                                        .replace('{from}', String(from))
                                        .replace('{to}', String(to))
                                        .replace('{total}', String(total))}
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        disabled={page <= 1}
                                        onClick={() =>
                                            setPage((p) => Math.max(1, p - 1))
                                        }
                                    >
                                        <ChevronLeft className="size-4" />
                                    </Button>
                                    <span className="px-1 text-sm tabular-nums text-muted-foreground">
                                        {page} / {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="size-8"
                                        disabled={page >= totalPages}
                                        onClick={() =>
                                            setPage((p) =>
                                                Math.min(totalPages, p + 1),
                                            )
                                        }
                                    >
                                        <ChevronRight className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
                </>
            )}

            {adjust && (
                <AdjustStockModal
                    branchId={branchId}
                    productName={pName(adjust.product)}
                    variant={adjust.variant}
                    onClose={() => setAdjust(null)}
                />
            )}
        </div>
    );
}

function StatCard({
    icon: Icon,
    label,
    value,
    warn,
}: {
    icon: typeof Boxes;
    label: string;
    value: number;
    warn?: boolean;
}) {
    return (
        <div className="flex items-center gap-3.5 rounded-2xl border bg-card p-4 transition-colors hover:border-pink-300/60 dark:hover:border-pink-800/60">
            <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${
                    warn
                        ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
                        : 'bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400'
                }`}
            >
                <Icon className="size-5" />
            </span>
            <div className="min-w-0">
                <p className="text-2xl font-extrabold leading-none tabular-nums">
                    {value}
                </p>
                <p className="mt-1.5 truncate text-xs font-medium text-muted-foreground">
                    {label}
                </p>
            </div>
        </div>
    );
}

function VariantRow({
    variant,
    onAdjust,
}: {
    variant: InventoryVariantRow;
    onAdjust: () => void;
}) {
    const { t } = useI18n();
    const swatch = variant.colorHex ?? undefined;
    const colorName =
        variant.color && !variant.color.startsWith('#') ? variant.color : null;
    const label = [variant.size, colorName].filter(Boolean).join(' · ');
    const out = variant.quantityAvailable <= 0;
    const low = !out && variant.quantityAvailable <= LOW_STOCK_THRESHOLD;

    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            {swatch && (
                <span
                    className="size-4 shrink-0 rounded-full border border-border"
                    style={{ backgroundColor: swatch }}
                    title={variant.color ?? undefined}
                />
            )}
            <div className="min-w-0 flex-1">
                <p className="text-sm">{label || '—'}</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                    {variant.variantSku}
                </p>
            </div>

            {variant.quantityReserved > 0 && (
                <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {variant.quantityReserved} {t('inventory.reserved')}
                </span>
            )}

            <span
                className={`inline-flex min-w-16 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ${
                    out
                        ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                        : low
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                          : 'bg-muted text-foreground'
                }`}
            >
                {(out || low) && <AlertTriangle className="size-3" />}
                {out
                    ? t('inventory.outOfStock')
                    : `${variant.quantityAvailable}`}
            </span>

            <Button
                variant="outline"
                size="sm"
                onClick={onAdjust}
                className="shrink-0"
            >
                <Pencil className="mr-1.5 size-3.5" />
                {t('inventory.adjust')}
            </Button>
        </div>
    );
}

function AdjustStockModal({
    branchId,
    productName,
    variant,
    onClose,
}: {
    branchId: string;
    productName: string;
    variant: InventoryVariantRow;
    onClose: () => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const setStock = useSetStock();
    const [qty, setQty] = useState(String(variant.quantityAvailable));

    const colorName =
        variant.color && !variant.color.startsWith('#') ? variant.color : null;
    const label = [variant.size, colorName].filter(Boolean).join(' · ');

    function save() {
        setStock.mutate(
            {
                productVariantId: variant.variantId,
                branchId,
                quantityAvailable: Math.max(0, Number(qty) || 0),
            },
            {
                onSuccess: () => {
                    toast({
                        title: t('inventory.saved'),
                        variant: 'success',
                    });
                    onClose();
                },
                onError: (e) =>
                    toast({
                        title: t('common.toast.error'),
                        description: getErrorMessage(e),
                        variant: 'destructive',
                    }),
            },
        );
    }

    return (
        <ResponsiveModal
            open
            onOpenChange={(o) => {
                if (!o) onClose();
            }}
            className="sm:max-w-sm"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-2 pt-6">
                    <h2 className="text-lg font-bold">
                        {t('inventory.setStock')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {productName}
                        {label ? ` · ${label}` : ''}
                    </p>
                </div>
                <div className="space-y-4 px-6 py-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                            {t('inventory.currentStock')}
                        </span>
                        <span className="font-semibold tabular-nums">
                            {variant.quantityAvailable}
                        </span>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium">
                            {t('inventory.newQuantity')}
                        </label>
                        <Input
                            type="number"
                            min={0}
                            value={qty}
                            autoFocus
                            onChange={(e) => setQty(e.target.value)}
                            className="h-11"
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={setStock.isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={save}
                        disabled={setStock.isPending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {setStock.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
