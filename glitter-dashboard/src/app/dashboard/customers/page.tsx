'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { ResourceList } from '@/components/resource/resource-list';
import { Combobox } from '@/components/ui/combobox';
import { getUserColumns } from '@/features/users/components/user-columns';
import { useDeleteUser, useUsers } from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import {
    ACCOUNT_STATUSES,
    type AccountStatus,
    type User,
} from '@/types/user';

const STATUS_LABELS: Record<AccountStatus, TranslationKey> = {
    active: 'user.status.active',
    suspended: 'user.status.suspended',
    deleted: 'user.status.deleted',
};

export default function CustomersPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const deleteUser = useDeleteUser();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');

    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const { data, isLoading, isFetching } = useUsers({
        page,
        limit: pageSize,
        role: 'customer',
        search: search || undefined,
        accountStatus: statusFilter || undefined,
    });

    const statusOptions = useMemo(
        () => [
            { value: '', label: t('user.filter.allStatuses') },
            ...ACCOUNT_STATUSES.map((s) => ({
                value: s,
                label: t(STATUS_LABELS[s]),
            })),
        ],
        [t],
    );

    const columns = useMemo(
        () =>
            getUserColumns({
                t,
                language,
                showRole: false,
                showBranch: false,
                onView: (u) => router.push(`/dashboard/customers/${u.id}`),
                onEdit: (u) =>
                    router.push(`/dashboard/customers/${u.id}/edit`),
                onDelete: (u) => setDeletingUser(u),
            }),
        [t, language, router],
    );

    async function handleDelete() {
        if (!deletingUser) return;
        try {
            await deleteUser.mutateAsync(deletingUser.id);
            toast({ title: t('user.delete.success'), variant: 'success' });
            setDeletingUser(null);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <ResourceList
            title={t('customer.list.title')}
            subtitle={t('customer.list.subtitle')}
            createLabel={t('customer.action.create')}
            onCreate={() => router.push('/dashboard/customers/new')}
            search={search}
            onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
            }}
            searchPlaceholder={t('customer.list.search')}
            filters={
                <div className="w-44">
                    <Combobox
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(v) => {
                            setStatusFilter(v as AccountStatus | '');
                            setPage(1);
                        }}
                        placeholder={t('user.filter.status')}
                    />
                </div>
            }
            columns={columns}
            data={data?.data ?? []}
            isLoading={isLoading}
            isFetching={isFetching}
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
            }}
            emptyTitle={t('customer.list.empty')}
            emptyDescription={t('customer.list.emptyHelp')}
            emptyFilteredTitle={t('customer.list.noMatch')}
            hasActiveFilters={search !== '' || statusFilter !== ''}
        >
            <ConfirmDialog
                open={deletingUser !== null}
                onOpenChange={(o) => {
                    if (!o) setDeletingUser(null);
                }}
                title={t('user.delete.title')}
                description={t('user.delete.message').replace(
                    '{name}',
                    deletingUser?.fullName ?? '',
                )}
                confirmLabel={t('user.delete.confirm')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={deleteUser.isPending}
                onConfirm={handleDelete}
            />
        </ResourceList>
    );
}
