'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { formatDistanceToNow } from 'date-fns';
import { Phone, Plus, Store, X } from 'lucide-react';
import { RowActions } from '@/components/resource/row-actions';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import {
    DataTable,
    DataTableEmpty,
    DataTableFilterTabs,
    DataTablePagination,
    DataTableSearch,
} from '@/components/data-table';
import type {
    DataTableColumnMeta,
    DataTableSort,
    FilterTabOption,
} from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { OrderStatsCards } from '@/features/orders/components/order-stats-cards';
import {
    OrderSourceBadge,
    OrderStatusBadge,
    PaymentStatusBadge,
} from '@/features/orders/components/order-status-badge';
import { useOrders } from '@/features/orders/use-orders';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';
import { useSelectedBranchId } from '@/stores/use-branch-context';
import type {
    OrderListItem,
    OrderPaymentStatus,
    OrderSortBy,
    OrderSource,
    OrderStatus,
} from '@/types/order';

const STATUS_VALUES: OrderStatus[] = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled',
    'refunded',
];
const PAYMENT_VALUES: OrderPaymentStatus[] = [
    'unpaid',
    'partial',
    'paid',
    'refunded',
];
const SORTABLE: OrderSortBy[] = [
    'createdAt',
    'orderNumber',
    'grandTotal',
    'status',
    'paymentStatus',
    'customerName',
    'source',
    'branchName',
];
type DatePreset = 'all' | 'today' | '7d' | '30d' | 'month';

/** Local 'YYYY-MM-DD'. */
function ymd(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function presetRange(p: DatePreset): { from?: string; to?: string } {
    const now = new Date();
    if (p === 'today') return { from: ymd(now), to: ymd(now) };
    if (p === '7d' || p === '30d') {
        const from = new Date(now);
        from.setDate(now.getDate() - (p === '7d' ? 6 : 29));
        return { from: ymd(from), to: ymd(now) };
    }
    if (p === 'month') {
        return {
            from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)),
            to: ymd(now),
        };
    }
    return {};
}

function formatDateTime(value: string): { date: string; time: string } {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return { date: '', time: '' };
    return {
        date: new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(
            d,
        ),
        time: new Intl.DateTimeFormat('en-US', { timeStyle: 'short' }).format(
            d,
        ),
    };
}

function OrdersPageContent() {
    const { t } = useI18n();
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const selectedBranchId = useSelectedBranchId();

    // All list state lives in the URL, so Back from an order keeps the view.
    const page = Math.max(1, Number(params.get('page')) || 1);
    const pageSize = Number(params.get('size')) || 10;
    const source = (params.get('source') ?? 'all') as OrderSource | 'all';
    const status = (params.get('status') ?? '') as OrderStatus | '';
    const payment = (params.get('payment') ?? '') as OrderPaymentStatus | '';
    const datePreset = (params.get('date') ?? 'all') as DatePreset;
    const search = params.get('q') ?? '';
    const sortBy = SORTABLE.includes(params.get('sort') as OrderSortBy)
        ? (params.get('sort') as OrderSortBy)
        : 'createdAt';
    const sortDesc = params.get('dir') !== 'asc';

    function update(
        patch: Record<string, string | number | null>,
        resetPage = true,
    ) {
        const next = new URLSearchParams(params.toString());
        for (const [k, v] of Object.entries(patch)) {
            if (v === null || v === '' || v === 'all') next.delete(k);
            else next.set(k, String(v));
        }
        if (resetPage) next.delete('page');
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }

    // Back to page 1 when the branch in the top bar changes.
    const lastBranch = useRef(selectedBranchId);
    useEffect(() => {
        if (lastBranch.current === selectedBranchId) return;
        lastBranch.current = selectedBranchId;
        if (params.get('page')) update({}, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBranchId]);

    const { from, to } = presetRange(datePreset);
    const { data, isLoading, isFetching } = useOrders({
        page,
        limit: pageSize,
        source: source === 'all' ? undefined : source,
        status: status || undefined,
        paymentStatus: payment || undefined,
        branchId: selectedBranchId ?? undefined,
        search: search || undefined,
        from,
        to,
        sortBy,
        sortOrder: sortDesc ? 'DESC' : 'ASC',
    });

    const orders = data?.data ?? [];
    const total = data?.total ?? 0;

    const sourceTabs: FilterTabOption<OrderSource | 'all'>[] = useMemo(
        () => [
            { value: 'all', label: t('order.source.all') },
            { value: 'in_store', label: t('order.source.in_store') },
            { value: 'online', label: t('order.source.online') },
        ],
        [t],
    );
    const statusOptions = useMemo(
        () => [
            { value: '', label: t('order.status.all') },
            ...STATUS_VALUES.map((s) => ({
                value: s,
                label: t(`order.status.${s}` as const),
            })),
        ],
        [t],
    );
    const paymentOptions = useMemo(
        () => [
            { value: '', label: t('order.filter.allPayments') },
            ...PAYMENT_VALUES.map((p) => ({
                value: p,
                label: t(`order.payment.${p}` as const),
            })),
        ],
        [t],
    );
    const dateOptions = useMemo(
        () =>
            (
                [
                    ['all', 'order.date.all'],
                    ['today', 'order.date.today'],
                    ['7d', 'order.date.7d'],
                    ['30d', 'order.date.30d'],
                    ['month', 'order.date.month'],
                ] as const
            ).map(([value, key]) => ({ value, label: t(key) })),
        [t],
    );

    // Branch column only when looking across branches.
    const showBranch = !selectedBranchId;

    const columns = useMemo<ColumnDef<OrderListItem, unknown>[]>(() => {
        const sortable = (extra: DataTableColumnMeta = {}) => ({
            sortable: true,
            ...extra,
        });
        const cols: ColumnDef<OrderListItem, unknown>[] = [
            {
                id: 'orderNumber',
                accessorKey: 'orderNumber',
                header: t('order.col.orderNumber'),
                meta: sortable(),
                cell: ({ row }) => (
                    <Link
                        href={`/dashboard/orders/${row.original.id}`}
                        className="whitespace-nowrap font-mono text-sm font-semibold hover:text-pink-600 dark:hover:text-pink-300"
                    >
                        {row.original.orderNumber}
                    </Link>
                ),
            },
            {
                id: 'createdAt',
                accessorKey: 'createdAt',
                header: t('order.col.date'),
                meta: sortable(),
                cell: ({ row }) => {
                    const { date, time } = formatDateTime(
                        row.original.createdAt,
                    );
                    return (
                        <div
                            className="whitespace-nowrap"
                            title={formatDistanceToNow(
                                new Date(row.original.createdAt),
                                { addSuffix: true },
                            )}
                        >
                            <div className="text-sm">{date}</div>
                            <div className="text-xs text-muted-foreground">
                                {time}
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'customerName',
                accessorKey: 'customerName',
                header: t('order.col.customer'),
                meta: sortable(),
                cell: ({ row }) => {
                    const o = row.original;
                    if (!o.customerName) {
                        return (
                            <span className="text-sm italic text-muted-foreground">
                                {t('order.customer.walkIn')}
                            </span>
                        );
                    }
                    return (
                        <div className="min-w-0 max-w-48">
                            <div className="truncate text-sm font-medium">
                                {o.customerName}
                            </div>
                            {o.customerPhone && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Phone className="size-3" />
                                    {o.customerPhone}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'source',
                accessorKey: 'source',
                header: t('order.col.source'),
                meta: sortable(),
                cell: ({ row }) => (
                    <OrderSourceBadge source={row.original.source} />
                ),
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: t('order.col.status'),
                meta: sortable(),
                cell: ({ row }) => (
                    <OrderStatusBadge status={row.original.status} />
                ),
            },
            {
                id: 'paymentStatus',
                accessorKey: 'paymentStatus',
                header: t('order.col.payment'),
                meta: sortable(),
                cell: ({ row }) => (
                    <PaymentStatusBadge status={row.original.paymentStatus} />
                ),
            },
        ];
        if (showBranch) {
            cols.push({
                id: 'branchName',
                accessorKey: 'branchName',
                header: t('order.col.branch'),
                meta: sortable(),
                cell: ({ row }) =>
                    row.original.branchName ? (
                        <span className="flex max-w-40 items-center gap-1.5 truncate text-sm text-muted-foreground">
                            <Store className="size-3.5 shrink-0" />
                            <span className="truncate">
                                {row.original.branchName}
                            </span>
                        </span>
                    ) : null,
            });
        }
        cols.push(
            {
                id: 'itemCount',
                accessorKey: 'itemCount',
                header: t('order.col.items'),
                meta: { align: 'right' },
                cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">
                        {row.original.itemCount}
                    </span>
                ),
            },
            {
                id: 'grandTotal',
                accessorKey: 'grandTotal',
                header: t('order.col.total'),
                meta: sortable({ align: 'right' }),
                cell: ({ row }) => (
                    <span className="font-semibold tabular-nums">
                        {formatPrice(row.original.grandTotal)}
                    </span>
                ),
            },
            {
                id: 'open',
                header: () => (
                    <span className="sr-only">{t('common.actions')}</span>
                ),
                size: 60,
                meta: { align: 'right' },
                cell: ({ row }) => (
                    <RowActions
                        viewHref={`/dashboard/orders/${row.original.id}`}
                        audit={{
                            entity: 'orders',
                            id: row.original.id,
                            label: row.original.orderNumber,
                        }}
                    />
                ),
            },
        );
        return cols;
    }, [t, showBranch]);

    const hasActiveFilters =
        search !== '' ||
        source !== 'all' ||
        status !== '' ||
        payment !== '' ||
        datePreset !== 'all';

    function clearFilters() {
        update({
            q: null,
            source: null,
            status: null,
            payment: null,
            date: null,
        });
    }

    const sort: DataTableSort = { id: sortBy, desc: sortDesc };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('order.list.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('order.list.subtitle')}
                    </p>
                </div>
                <Button
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                    nativeButton={false}
                    render={
                        <Link href="/dashboard/orders/new">
                            <Plus className="mr-2 size-4" />
                            {t('order.action.create')}
                        </Link>
                    }
                />
            </div>

            {/* Summary stat cards */}
            <OrderStatsCards branchId={selectedBranchId} />

            {/* Filters + table as one card */}
            <div className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <DataTableFilterTabs
                        options={sourceTabs}
                        value={source}
                        onChange={(v) => update({ source: v })}
                    />
                    <DataTableSearch
                        value={search}
                        onChange={(v) => update({ q: v })}
                        placeholder={t('order.list.search')}
                        className="w-full lg:w-72"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="w-full sm:w-44">
                        <Combobox
                            options={statusOptions}
                            value={status}
                            onChange={(v) => update({ status: v })}
                            placeholder={t('order.filter.status')}
                            searchPlaceholder={t('order.filter.status')}
                            emptyMessage={t('order.list.noMatch')}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Combobox
                            options={paymentOptions}
                            value={payment}
                            onChange={(v) => update({ payment: v })}
                            placeholder={t('order.filter.allPayments')}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Combobox
                            options={dateOptions}
                            value={datePreset}
                            onChange={(v) => update({ date: v || 'all' })}
                            placeholder={t('order.date.all')}
                        />
                    </div>
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFilters}
                            className="text-muted-foreground"
                        >
                            <X className="mr-1 size-3.5" />
                            {t('order.list.clearFilters')}
                        </Button>
                    )}
                    <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                        {t('order.list.count').replace(
                            '{count}',
                            String(total),
                        )}
                    </span>
                </div>

                <DataTable
                    data={orders}
                    columns={columns}
                    isLoading={isLoading}
                    isFetching={isFetching}
                    skeletonRows={Math.min(pageSize, 10)}
                    sort={sort}
                    onSortChange={(s) =>
                        update({ sort: s.id, dir: s.desc ? null : 'asc' }, true)
                    }
                    onRowClick={(o) => router.push(`/dashboard/orders/${o.id}`)}
                    emptyState={
                        hasActiveFilters ? (
                            <DataTableEmpty
                                title={t('order.list.noMatch')}
                                description=""
                                action={
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={clearFilters}
                                    >
                                        {t('order.list.clearFilters')}
                                    </Button>
                                }
                            />
                        ) : (
                            <DataTableEmpty
                                title={t('order.list.empty')}
                                description={t('order.list.emptyHelp')}
                            />
                        )
                    }
                />

                {!isLoading && total > 0 && (
                    <DataTablePagination
                        page={page}
                        pageSize={pageSize}
                        total={total}
                        onPageChange={(p) => update({ page: p }, false)}
                        onPageSizeChange={(size) => update({ size })}
                        disabled={isFetching}
                    />
                )}
            </div>
        </div>
    );
}

/** URL-driven list state needs a Suspense boundary (useSearchParams). */
export default function OrdersPage() {
    return (
        <Suspense>
            <OrdersPageContent />
        </Suspense>
    );
}
