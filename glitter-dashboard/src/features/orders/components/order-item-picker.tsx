'use client';

import { Loader2, Package, Plus, Search } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useProductAvailability } from '@/features/inventory-branch/use-inventory-branch';
import { useProducts } from '@/features/products/use-products';
import { useProductVariants } from '@/features/product-variants/use-product-variants';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

/** A single line the picker hands back to the order form. */
export interface CartLine {
    productId: string;
    productVariantId: string;
    productName: string;
    variantSku: string;
    size: string | null;
    color: string | null;
    colorHex: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
}

/** Primary image URL for a product (falls back to its first image). */
function productImageUrl(product: Product): string | null {
    const primary =
        product.images?.find((img) => img.imageType === 'primary') ??
        product.images?.[0];
    return getFileUrl(primary?.imageUrl ?? null);
}

interface OrderItemPickerProps {
    branchId: string;
    onAdd: (line: CartLine) => void;
}

/**
 * Self-contained product + variant + quantity picker for building an order.
 *
 * Products are searched server-side (small payload), shown in an absolutely
 * positioned dropdown that never grows the page. Variants are picked as chips
 * (swatch + name + price + branch stock), avoiding a second dropdown.
 */
export function OrderItemPicker({ branchId, onAdd }: OrderItemPickerProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const boxRef = useRef<HTMLDivElement>(null);

    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [variantId, setVariantId] = useState('');
    const [qty, setQty] = useState(1);

    // Debounce the term sent to the server so we don't fetch on every keystroke.
    useEffect(() => {
        const handle = window.setTimeout(() => setSearch(query.trim()), 250);
        return () => window.clearTimeout(handle);
    }, [query]);

    // Server-side product search — only 20 results, so the payload stays small/fast.
    const { data: productsData, isFetching } = useProducts({
        page: 1,
        limit: 20,
        search: search || undefined,
    });
    const results = productsData?.data ?? [];

    const { data: variants } = useProductVariants(product?.id);
    const { data: availability } = useProductAvailability(product?.id);

    // Map variantId → available stock at the selected branch.
    const availByVariant = useMemo(() => {
        const map = new Map<string, number>();
        if (!branchId || !availability) return map;
        availability.branches
            .filter((b) => b.branchId === branchId)
            .forEach((b) =>
                map.set(b.variantId, (map.get(b.variantId) ?? 0) + b.quantityAvailable),
            );
        return map;
    }, [availability, branchId]);

    // Close the results dropdown when clicking outside.
    useEffect(() => {
        function onPointerDown(e: MouseEvent) {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, []);

    function pickProduct(p: Product) {
        setProduct(p);
        setQuery(language === 'km' ? p.nameKm : p.nameEn);
        setVariantId('');
        setOpen(false);
    }

    function handleAdd() {
        const variant = variants?.find((v) => v.id === variantId);
        if (!product || !variant) return;

        // Block out-of-stock at the selected branch (both sources draw from stock).
        if (branchId) {
            const avail = availByVariant.get(variant.id) ?? 0;
            if (avail < Math.max(1, qty)) {
                toast({
                    title: t('common.toast.error'),
                    description: t('order.create.outOfStock'),
                    variant: 'destructive',
                });
                return;
            }
        }

        onAdd({
            productId: product.id,
            productVariantId: variant.id,
            productName: language === 'km' ? product.nameKm : product.nameEn,
            variantSku: variant.variantSku,
            size: variant.size,
            color: variant.color,
            colorHex: variant.colorHex,
            imageUrl: productImageUrl(product),
            unitPrice: variant.effectivePrice,
            quantity: Math.max(1, qty),
        });

        // Reset for the next item.
        setProduct(null);
        setQuery('');
        setVariantId('');
        setQty(1);
    }

    return (
        <div className="space-y-4">
            {/* Product search — self-contained dropdown (absolute, never grows the page) */}
            <div ref={boxRef} className="relative">
                <label className="mb-1.5 block text-sm font-medium">
                    {t('order.create.selectProduct')}
                </label>
                <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setProduct(null);
                            setVariantId('');
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        placeholder={t('order.create.selectProduct')}
                        className="h-11 pl-9 pr-9"
                    />
                    {isFetching && (
                        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                </div>

                {open && (
                    <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border/60 bg-popover py-1 shadow-lg">
                        {results.length === 0 ? (
                            <li className="px-3 py-3 text-sm text-muted-foreground">
                                {isFetching
                                    ? t('common.loading')
                                    : t('order.list.noMatch')}
                            </li>
                        ) : (
                            results.map((p) => {
                                const url = productImageUrl(p);
                                return (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            onClick={() => pickProduct(p)}
                                            className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/60"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border/60 bg-muted/40">
                                                {url ? (
                                                    <Image
                                                        src={url}
                                                        alt=""
                                                        width={36}
                                                        height={36}
                                                        className="size-full object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <Package className="size-4 text-muted-foreground/40" />
                                                )}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-medium">
                                                    {language === 'km' ? p.nameKm : p.nameEn}
                                                </span>
                                                <span className="block truncate font-mono text-xs text-muted-foreground">
                                                    {p.sku}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                )}
            </div>

            {/* Variant chips — shown once a product is picked */}
            {product && (
                <div className="space-y-2">
                    <label className="block text-sm font-medium">
                        {t('order.create.selectVariant')}
                    </label>
                    {!variants ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    ) : variants.length === 0 ? (
                        <p className="text-sm text-muted-foreground">—</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {variants.map((v) => {
                                const label =
                                    [v.size, v.color].filter(Boolean).join(' · ') ||
                                    v.variantSku;
                                const avail = branchId
                                    ? availByVariant.get(v.id) ?? 0
                                    : null;
                                const outOfStock = avail !== null && avail <= 0;
                                const selected = variantId === v.id;
                                return (
                                    <button
                                        key={v.id}
                                        type="button"
                                        disabled={outOfStock}
                                        onClick={() => setVariantId(v.id)}
                                        className={cn(
                                            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors',
                                            selected
                                                ? 'border-pink-500 bg-pink-50 dark:border-pink-700 dark:bg-pink-500/10'
                                                : 'border-border/60 hover:bg-muted/50',
                                            outOfStock && 'cursor-not-allowed opacity-50',
                                        )}
                                    >
                                        {v.colorHex && (
                                            <span
                                                className="size-3.5 shrink-0 rounded-full border border-border"
                                                style={{ backgroundColor: v.colorHex }}
                                            />
                                        )}
                                        <span className="font-medium text-foreground">
                                            {label}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {formatPrice(v.effectivePrice)}
                                        </span>
                                        {avail !== null && (
                                            <span
                                                className={
                                                    outOfStock
                                                        ? 'text-destructive'
                                                        : 'text-emerald-600 dark:text-emerald-400'
                                                }
                                            >
                                                {outOfStock
                                                    ? t('order.create.outOfStock')
                                                    : t('order.create.inStock').replace(
                                                          '{count}',
                                                          String(avail),
                                                      )}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="flex items-end gap-3 pt-1">
                        <div className="w-24">
                            <label className="mb-1.5 block text-sm font-medium">
                                {t('order.create.qty')}
                            </label>
                            <Input
                                type="number"
                                min={1}
                                value={qty}
                                onChange={(e) =>
                                    setQty(e.target.value === '' ? 1 : Number(e.target.value))
                                }
                                className="h-11"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleAdd}
                            disabled={!variantId}
                            className="h-11"
                        >
                            <Plus className="mr-1.5 size-4" />
                            {t('order.create.add')}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
