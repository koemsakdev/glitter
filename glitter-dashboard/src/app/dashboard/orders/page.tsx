'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Plus } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import {
    DataTable,
    DataTableEmpty,
    DataTableFilterTabs,
    DataTablePagination,
    DataTableSearch,
    DataTableToolbar,
} from '@/components/data-table';
import type { FilterTabOption } from '@/components/data-table';
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
    OrderSource,
    OrderStatus,
} from '@/types/order';

type SourceFilter = OrderSource | 'all';
type StatusFilter = OrderStatus | 'all';

const STATUS_VALUES: OrderStatus[] = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled',
    'refunded',
];

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export default function OrdersPage() {
    const { t } = useI18n();
    const selectedBranchId = useSelectedBranchId();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [search, setSearch] = useState('');

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPage(1);
    }, [selectedBranchId]);

    const { data, isLoading, isFetching } = useOrders({
        page,
        limit: pageSize,
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        branchId: selectedBranchId ?? undefined,
        search: search || undefined,
    });

    const orders = data?.data ?? [];
    const total = data?.total ?? 0;

    const sourceTabs: FilterTabOption<SourceFilter>[] = useMemo(
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

    const columns = useMemo<ColumnDef<OrderListItem>[]>(
        () => [
            {
                accessorKey: 'orderNumber',
                header: t('order.col.orderNumber'),
                cell: ({ row }) => (
                    <Link
                        href={`/dashboard/orders/${row.original.id}`}
                        className="font-mono text-sm font-semibold hover:text-pink-600 dark:hover:text-pink-300"
                    >
                        {row.original.orderNumber}
                    </Link>
                ),
            },
            {
                accessorKey: 'source',
                header: t('order.col.source'),
                cell: ({ row }) => <OrderSourceBadge source={row.original.source} />,
            },
            {
                accessorKey: 'status',
                header: t('order.col.status'),
                cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
            },
            {
                accessorKey: 'paymentStatus',
                header: t('order.col.payment'),
                cell: ({ row }) => (
                    <PaymentStatusBadge status={row.original.paymentStatus} />
                ),
            },
            {
                accessorKey: 'customerName',
                header: t('order.col.customer'),
                cell: ({ row }) =>
                    row.original.customerName ? (
                        <span className="text-sm">{row.original.customerName}</span>
                    ) : (
                        <span className="text-sm italic text-muted-foreground">
                            {t('order.customer.walkIn')}
                        </span>
                    ),
            },
            {
                accessorKey: 'branchName',
                header: t('order.col.branch'),
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {row.original.branchName ?? '—'}
                    </span>
                ),
            },
            {
                accessorKey: 'itemCount',
                header: t('order.col.items'),
                cell: ({ row }) => (
                    <span className="tabular-nums">{row.original.itemCount}</span>
                ),
            },
            {
                accessorKey: 'grandTotal',
                header: t('order.col.total'),
                cell: ({ row }) => (
                    <span className="font-semibold tabular-nums">
                        {formatPrice(row.original.grandTotal)}
                    </span>
                ),
            },
            {
                accessorKey: 'createdAt',
                header: t('order.col.date'),
                cell: ({ row }) => (
                    <span className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDate(row.original.createdAt)}
                    </span>
                ),
            },
            {
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <Button
                        variant="ghost"
                        size="icon"
                        nativeButton={false}
                        className="size-8 text-muted-foreground hover:text-foreground"
                        render={
                            <Link href={`/dashboard/orders/${row.original.id}`}>
                                <Eye className="size-4" />
                            </Link>
                        }
                    />
                ),
            },
        ],
        [t],
    );

    const hasActiveFilters =
        search !== '' || sourceFilter !== 'all' || statusFilter !== 'all';

    function handleClearFilters() {
        setSearch('');
        setSourceFilter('all');
        setStatusFilter('all');
        setPage(1);
    }

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

            {/* Toolbar — source tabs + search */}
            <DataTableToolbar
                left={
                    <DataTableFilterTabs
                        options={sourceTabs}
                        value={sourceFilter}
                        onChange={(v) => {
                            setSourceFilter(v);
                            setPage(1);
                        }}
                    />
                }
                right={
                    <DataTableSearch
                        value={search}
                        onChange={(v) => {
                            setSearch(v);
                            setPage(1);
                        }}
                        placeholder={t('order.list.search')}
                        className="w-full sm:w-65"
                    />
                }
            />

            {/* Status filter */}
            <div className="sm:w-65">
                <Combobox
                    options={statusOptions}
                    value={statusFilter === 'all' ? '' : statusFilter}
                    onChange={(v) => {
                        setStatusFilter((v || 'all') as StatusFilter);
                        setPage(1);
                    }}
                    placeholder={t('order.filter.status')}
                    searchPlaceholder={t('order.filter.status')}
                    emptyMessage={t('order.list.noMatch')}
                />
            </div>

            {/* Table */}
            <DataTable
                data={orders}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    hasActiveFilters ? (
                        <DataTableEmpty
                            title={t('order.list.noMatch')}
                            description=""
                            action={
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleClearFilters}
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

            {!isLoading && (
                <DataTablePagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                        setPageSize(size);
                        setPage(1);
                    }}
                    disabled={isFetching}
                />
            )}
        </div>
    );
}
