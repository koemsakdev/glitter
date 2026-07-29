'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
    ArrowUpDown,
    Check,
    ChevronsUpDown,
    DollarSign,
    ListFilter,
    Loader2,
    Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export type SortOption = { key: string; trKey: string };
export type BrandOption = { id: string; name: string; logo?: string | null };

function BrandLogo({ logo, name }: { logo?: string | null; name: string }) {
    // Circular, edge-to-edge logo — no box, border or padding around the image.
    return (
        <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full">
            {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-full object-cover" />
            ) : (
                <span className="flex size-full items-center justify-center rounded-full bg-zinc-100 text-[11px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {name.charAt(0).toUpperCase()}
                </span>
            )}
        </span>
    );
}

function Dot() {
    return (
        <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-(--brand) ring-2 ring-white dark:ring-zinc-950" />
    );
}

/** A compact "$" number input for the price-range filter. */
function PriceField({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
}) {
    return (
        <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                $
            </span>
            <input
                type="number"
                inputMode="decimal"
                min={0}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-9 w-full rounded-lg border border-zinc-200 bg-white pl-5 pr-2 text-sm outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
        </div>
    );
}

export function ProductFilters({
    brands,
    sortOptions,
    lang: initialLang,
}: {
    brands: BrandOption[];
    sortOptions: SortOption[];
    lang: Lang;
}) {
    const router = useRouter();
    const params = useSearchParams();
    // Read the language from the client context so the labels switch instantly
    // when the user toggles EN/KM (instead of waiting for a server re-render).
    const { lang } = useLang(initialLang);
    const [isPending, startTransition] = useTransition();
    const appliedRef = useRef(false);

    const labels = {
        filters: tr(lang, 'filters'),
        sortBy: tr(lang, 'sortBy'),
        brands: tr(lang, 'brands'),
        searchBrands: tr(lang, 'searchBrands'),
        noBrands: tr(lang, 'noBrands'),
        clear: tr(lang, 'clear'),
        apply: tr(lang, 'apply'),
        applying: tr(lang, 'applying'),
        selected: tr(lang, 'selected'),
        price: tr(lang, 'price'),
        minPrice: tr(lang, 'min'),
        maxPrice: tr(lang, 'max'),
    };
    const sorts = sortOptions.map((s) => ({
        key: s.key,
        label: tr(lang, s.trKey),
    }));

    const defaultSort = sorts[0]?.key ?? 'newest';
    const urlSort = params.get('sort') ?? defaultSort;
    const urlBrands = (params.get('brandIds') ?? '').split(',').filter(Boolean);
    const urlMin = params.get('minPrice') ?? '';
    const urlMax = params.get('maxPrice') ?? '';

    const sortActive = urlSort !== defaultSort;
    const brandActive = urlBrands.length > 0;
    const priceActive = Boolean(urlMin || urlMax);
    const anyActive = sortActive || brandActive || priceActive;

    function apply(next: {
        sort?: string;
        brands?: string[];
        minPrice?: string;
        maxPrice?: string;
    }) {
        const p = new URLSearchParams(params.toString());
        if (next.sort !== undefined) {
            if (next.sort && next.sort !== defaultSort) p.set('sort', next.sort);
            else p.delete('sort');
        }
        if (next.brands !== undefined) {
            if (next.brands.length) p.set('brandIds', next.brands.join(','));
            else p.delete('brandIds');
        }
        if (next.minPrice !== undefined) {
            if (next.minPrice) p.set('minPrice', next.minPrice);
            else p.delete('minPrice');
        }
        if (next.maxPrice !== undefined) {
            if (next.maxPrice) p.set('maxPrice', next.maxPrice);
            else p.delete('maxPrice');
        }
        p.delete('page');
        // Wrap in a transition so `isPending` is true while the server renders
        // the filtered list — that drives the "Applying…" feedback and the
        // popovers/sheet stay open until it's done.
        appliedRef.current = true;
        startTransition(() => {
            router.replace(`/products?${p.toString()}`, { scroll: false });
        });
    }

    const sortLabel =
        sorts.find((s) => s.key === urlSort)?.label ?? sorts[0]?.label;

    /* ---------- Sort combobox (applies on select) ---------- */
    const [sortOpen, setSortOpen] = useState(false);
    const SortCombobox = (
        <Popover open={sortOpen} onOpenChange={setSortOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'relative h-11 justify-between gap-2 rounded-full px-4 font-normal transition-colors',
                        sortActive &&
                            'border-(--brand)/50 bg-(--brand)/5 dark:bg-(--brand)/10',
                    )}
                >
                    <ArrowUpDown className="size-4 text-zinc-400" />
                    <span className="text-zinc-500 dark:text-zinc-400">
                        {labels.sortBy}:
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {sortLabel}
                    </span>
                    <ChevronsUpDown className="size-4 text-zinc-400" />
                    {sortActive && <Dot />}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
                <Command>
                    <CommandList>
                        <CommandGroup>
                            {sorts.map((o) => (
                                <CommandItem
                                    key={o.key}
                                    value={o.label}
                                    onSelect={() => {
                                        setSortOpen(false);
                                        apply({ sort: o.key });
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            'size-4 text-(--brand)',
                                            urlSort === o.key
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    {o.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );

    /* ---------- Brand multi-select (batched: applies on close/Apply) ---------- */
    const [brandOpen, setBrandOpen] = useState(false);
    const [pending, setPending] = useState<string[]>(urlBrands);

    function openBrands(open: boolean) {
        if (open) {
            setPending(urlBrands); // start from the current URL
        } else if (pending.join(',') !== urlBrands.join(',')) {
            apply({ brands: pending }); // commit once on close
        }
        setBrandOpen(open);
    }
    function togglePending(id: string) {
        setPending((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : [...prev, id],
        );
    }

    const BrandMultiSelect = (
        <Popover open={brandOpen} onOpenChange={openBrands}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'relative h-11 justify-between gap-2 rounded-full px-4 font-normal transition-colors',
                        brandActive &&
                            'border-(--brand)/50 bg-(--brand)/5 dark:bg-(--brand)/10',
                    )}
                >
                    <Tag className="size-4 text-zinc-400" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {labels.brands}
                    </span>
                    {urlBrands.length > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-(--brand) text-[11px] font-bold text-white">
                            {urlBrands.length}
                        </span>
                    )}
                    <ChevronsUpDown className="size-4 text-zinc-400" />
                    {brandActive && <Dot />}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
                <Command>
                    <CommandInput placeholder={labels.searchBrands} />
                    <CommandList>
                        <CommandEmpty>{labels.noBrands}</CommandEmpty>
                        <CommandGroup>
                            {brands.map((b) => {
                                const on = pending.includes(b.id);
                                return (
                                    <CommandItem
                                        key={b.id}
                                        value={b.name}
                                        onSelect={() => togglePending(b.id)}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-4 items-center justify-center rounded border',
                                                on
                                                    ? 'border-(--brand) bg-(--brand) text-white'
                                                    : 'border-zinc-300 dark:border-zinc-600',
                                            )}
                                        >
                                            {on && <Check className="size-3" />}
                                        </span>
                                        <BrandLogo logo={b.logo} name={b.name} />
                                        {b.name}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                    <div className="flex items-center justify-between gap-2 border-t border-zinc-100 p-2 dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={() => setPending([])}
                            className="px-2 text-xs font-medium text-zinc-500 hover:text-(--brand) dark:text-zinc-400"
                        >
                            {labels.clear}
                        </button>
                        <Button
                            size="sm"
                            disabled={isPending}
                            className="gap-1.5"
                            onClick={() => apply({ brands: pending })}
                        >
                            {isPending && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {isPending ? labels.applying : labels.apply}
                        </Button>
                    </div>
                </Command>
            </PopoverContent>
        </Popover>
    );

    /* ---------- Price range (applies on Apply / close) ---------- */
    const [priceOpen, setPriceOpen] = useState(false);
    const [pMin, setPMin] = useState(urlMin);
    const [pMax, setPMax] = useState(urlMax);

    function openPrice(open: boolean) {
        if (open) {
            setPMin(urlMin);
            setPMax(urlMax);
        }
        setPriceOpen(open);
    }

    const PriceFilter = (
        <Popover open={priceOpen} onOpenChange={openPrice}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'relative h-11 justify-between gap-2 rounded-full px-4 font-normal transition-colors',
                        priceActive &&
                            'border-(--brand)/50 bg-(--brand)/5 dark:bg-(--brand)/10',
                    )}
                >
                    <DollarSign className="size-4 text-zinc-400" />
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                        {labels.price}
                    </span>
                    <ChevronsUpDown className="size-4 text-zinc-400" />
                    {priceActive && <Dot />}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-3">
                <div className="flex items-center gap-2">
                    <PriceField
                        value={pMin}
                        onChange={setPMin}
                        placeholder={labels.minPrice}
                    />
                    <span className="text-zinc-400">–</span>
                    <PriceField
                        value={pMax}
                        onChange={setPMax}
                        placeholder={labels.maxPrice}
                    />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setPMin('');
                            setPMax('');
                        }}
                        className="px-2 text-xs font-medium text-zinc-500 hover:text-(--brand) dark:text-zinc-400"
                    >
                        {labels.clear}
                    </button>
                    <Button
                        size="sm"
                        disabled={isPending}
                        className="gap-1.5"
                        onClick={() => apply({ minPrice: pMin, maxPrice: pMax })}
                    >
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        {isPending ? labels.applying : labels.apply}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );

    /* ---------- Mobile: filter button + sheet (batched, Apply) ---------- */
    const [sheetOpen, setSheetOpen] = useState(false);
    const [pSort, setPSort] = useState(urlSort);
    const [pBrands, setPBrands] = useState<string[]>(urlBrands);
    const [pMinM, setPMinM] = useState(urlMin);
    const [pMaxM, setPMaxM] = useState(urlMax);

    function openSheet(open: boolean) {
        if (open) {
            setPSort(urlSort);
            setPBrands(urlBrands);
            setPMinM(urlMin);
            setPMaxM(urlMax);
        }
        setSheetOpen(open);
    }

    // Close the open popover/sheet once an apply's navigation has completed
    // (kept open during `isPending` so the "Applying…" spinner is visible).
    useEffect(() => {
        if (!isPending && appliedRef.current) {
            appliedRef.current = false;
            setBrandOpen(false);
            setPriceOpen(false);
            setSheetOpen(false);
        }
    }, [isPending]);

    return (
        <>
            {/* Desktop: inline comboboxes */}
            <div className="hidden items-center gap-2 lg:flex">
                {SortCombobox}
                {PriceFilter}
                {BrandMultiSelect}
            </div>

            {/* Mobile: filter button → sheet */}
            <div className="lg:hidden">
                <Sheet open={sheetOpen} onOpenChange={openSheet}>
                    <Button
                        size="icon"
                        aria-label={labels.filters}
                        className="relative size-11 rounded-full"
                        onClick={() => openSheet(true)}
                    >
                        <ListFilter className="size-5" />
                        {anyActive && <Dot />}
                    </Button>
                    <SheetContent>
                        <SheetTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                            {labels.filters}
                        </SheetTitle>

                        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {labels.sortBy}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {sorts.map((o) => (
                                <button
                                    key={o.key}
                                    type="button"
                                    onClick={() => setPSort(o.key)}
                                    className={cn(
                                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                                        pSort === o.key
                                            ? 'border-(--brand) bg-(--brand) text-white'
                                            : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300',
                                    )}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>

                        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {labels.price}
                        </h3>
                        <div className="mt-2 flex items-center gap-2">
                            <PriceField
                                value={pMinM}
                                onChange={setPMinM}
                                placeholder={labels.minPrice}
                            />
                            <span className="text-zinc-400">–</span>
                            <PriceField
                                value={pMaxM}
                                onChange={setPMaxM}
                                placeholder={labels.maxPrice}
                            />
                        </div>

                        <h3 className="mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            {labels.brands}
                            {pBrands.length > 0 &&
                                ` · ${pBrands.length} ${labels.selected}`}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {brands.map((b) => {
                                const on = pBrands.includes(b.id);
                                return (
                                    <button
                                        key={b.id}
                                        type="button"
                                        onClick={() =>
                                            setPBrands((prev) =>
                                                prev.includes(b.id)
                                                    ? prev.filter(
                                                          (x) => x !== b.id,
                                                      )
                                                    : [...prev, b.id],
                                            )
                                        }
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3.5 text-sm font-medium transition-colors',
                                            on
                                                ? 'border-(--brand) bg-(--brand) text-white'
                                                : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300',
                                        )}
                                    >
                                        <BrandLogo logo={b.logo} name={b.name} />
                                        {b.name}
                                        {on && <Check className="size-3.5" />}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-auto flex items-center gap-2 pt-6">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                    setPSort(defaultSort);
                                    setPBrands([]);
                                    setPMinM('');
                                    setPMaxM('');
                                }}
                            >
                                {labels.clear}
                            </Button>
                            <Button
                                className="flex-1 gap-1.5"
                                disabled={isPending}
                                onClick={() =>
                                    apply({
                                        sort: pSort,
                                        brands: pBrands,
                                        minPrice: pMinM,
                                        maxPrice: pMaxM,
                                    })
                                }
                            >
                                {isPending && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}
                                {isPending ? labels.applying : labels.apply}
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </>
    );
}
