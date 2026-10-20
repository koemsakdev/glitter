'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DataTable,
    DataTableEmpty,
    DataTablePagination,
    DataTableToolbar,
} from '@/components/data-table';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { recordsApi, type DeletedRecord } from '@/features/audit/audit-api';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useAuditTrail } from '@/stores/use-audit-trail';

/** Record types that are soft-deleted (mirrors the API's list). */
const TYPES: Record<string, TranslationKey> = {
    products: 'activity.entity.products',
    'product-variants': 'recycle.entity.variant',
    'product-images': 'recycle.entity.image',
    categories: 'activity.entity.categories',
    brands: 'activity.entity.brands',
    colors: 'activity.entity.colors',
    badges: 'activity.entity.badges',
    branches: 'activity.entity.branches',
    vouchers: 'activity.entity.vouchers',
    banners: 'activity.entity.banners',
    advertisements: 'activity.entity.ads',
    pages: 'activity.entity.pages',
    menu: 'activity.entity.menu',
    reviews: 'activity.entity.reviews',
    shipments: 'activity.entity.shipments',
    inventory: 'activity.entity.inventory',
};

/** Recycle bin: nothing is hard-deleted — restore it or see who removed it. */
export default function RecycleBinPage() {
    const { t } = useI18n();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const showTrail = useAuditTrail((s) => s.show);
    const [entity, setEntity] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [restoring, setRestoring] = useState<DeletedRecord | null>(null);

    const query = useQuery({
        queryKey: ['recycle-bin', entity, page, pageSize],
        queryFn: () =>
            recordsApi.deleted({
                entity: entity || undefined,
                page,
                limit: pageSize,
            }),
        placeholderData: (prev) => prev,
    });

    const restore = useMutation({
        mutationFn: (r: DeletedRecord) => recordsApi.restore(r.entity, r.id),
        onSuccess: () => {
            toast({ title: t('recycle.restored') });
            setRestoring(null);
            // The restored record shows up in its own list again.
            void queryClient.invalidateQueries();
        },
        onError: (error) =>
            toast({
                title: t('recycle.restoreFailed'),
                description: getErrorMessage(error),
                variant: 'destructive',
            }),
    });

    const typeOptions = useMemo(
        () => [
            { value: '', label: t('recycle.allTypes') },
            ...Object.entries(TYPES).map(([value, key]) => ({
                value,
                label: t(key),
            })),
        ],
        [t],
    );

    const columns = useMemo<ColumnDef<DeletedRecord, unknown>[]>(
        () => [
            {
                id: 'record',
                header: () => t('recycle.col.record'),
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate font-medium">
                            {row.original.label || t('recycle.unknown')}
                        </p>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">
                            {row.original.id}
                        </p>
                    </div>
                ),
            },
            {
                id: 'type',
                header: () => t('recycle.col.type'),
                cell: ({ row }) => (
                    <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                        {TYPES[row.original.entity]
                            ? t(TYPES[row.original.entity])
                            : row.original.entity}
                    </span>
                ),
            },
            {
                id: 'deletedBy',
                header: () => t('recycle.col.deletedBy'),
                cell: ({ row }) => {
                    const by = row.original.deletedBy;
                    if (!by)
                        return (
                            <span className="text-sm text-muted-foreground">
                                {t('recycle.unknown')}
                            </span>
                        );
                    return (
                        <div className="leading-tight">
                            <p className="text-sm font-medium">{by.name}</p>
                            {by.username && (
                                <p className="text-xs text-muted-foreground">
                                    @{by.username}
                                </p>
                            )}
                        </div>
                    );
                },
            },
            {
                id: 'deletedAt',
                header: () => t('recycle.col.deletedAt'),
                cell: ({ row }) => {
                    const d = new Date(row.original.deletedAt);
                    return (
                        <div className="whitespace-nowrap leading-tight">
                            <p className="text-sm">
                                {format(d, 'dd MMM yyyy, HH:mm')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(d, { addSuffix: true })}
                            </p>
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                header: () => (
                    <span className="sr-only">{t('common.actions')}</span>
                ),
                meta: { align: 'right' },
                cell: ({ row }) => (
                    <div className="flex justify-end gap-1.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            title={t('rowActions.auditTrail')}
                            onClick={() =>
                                showTrail({
                                    entity: row.original.entity,
                                    id: row.original.id,
                                    label: row.original.label,
                                })
                            }
                        >
                            <History className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            onClick={() => setRestoring(row.original)}
                        >
                            <RotateCcw className="size-3.5" />
                            {t('recycle.restore')}
                        </Button>
                    </div>
                ),
            },
        ],
        [t, showTrail],
    );

    const rows = query.data?.data ?? [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('recycle.title')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                    {t('recycle.subtitle')}
                </p>
            </div>

            <DataTableToolbar
                left={
                    <div className="w-52">
                        <Combobox
                            options={typeOptions}
                            value={entity}
                            onChange={(v) => {
                                setEntity(v);
                                setPage(1);
                            }}
                            placeholder={t('recycle.allTypes')}
                        />
                    </div>
                }
            />

            <DataTable
                data={rows}
                columns={columns}
                isLoading={query.isLoading}
                isFetching={query.isFetching && !query.isLoading}
                emptyState={<DataTableEmpty title={t('recycle.empty')} />}
            />

            {!query.isLoading && (
                <DataTablePagination
                    page={page}
                    pageSize={pageSize}
                    total={query.data?.total ?? 0}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                    disabled={query.isFetching}
                />
            )}

            <ConfirmDialog
                open={restoring !== null}
                onOpenChange={(o) => !o && setRestoring(null)}
                title={t('recycle.confirmTitle')}
                description={t('recycle.confirmBody')}
                confirmLabel={t('recycle.restore')}
                cancelLabel={t('common.cancel')}
                variant="info"
                icon={<RotateCcw className="size-5 text-sky-600" />}
                isPending={restore.isPending}
                onConfirm={() => {
                    if (restoring) restore.mutate(restoring);
                }}
            />
        </div>
    );
}
