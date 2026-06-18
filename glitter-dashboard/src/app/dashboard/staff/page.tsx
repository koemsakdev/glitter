'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { ResourceList } from '@/components/resource/resource-list';
import { Combobox } from '@/components/ui/combobox';
import { getUserColumns } from '@/features/users/components/user-columns';
import { UserFormDialog } from '@/features/users/components/user-form-dialog';
import { useDeleteUser, useUsers } from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import {
    ACCOUNT_STATUSES,
    STAFF_ROLES,
    type AccountStatus,
    type User,
    type UserRole,
} from '@/types/user';

const ROLE_LABELS: Record<UserRole, TranslationKey> = {
    customer: 'user.role.customer',
    cashier: 'user.role.cashier',
    manager: 'user.role.manager',
    admin: 'user.role.admin',
    super_admin: 'user.role.super_admin',
};
const STATUS_LABELS: Record<AccountStatus, TranslationKey> = {
    active: 'user.status.active',
    suspended: 'user.status.suspended',
    deleted: 'user.status.deleted',
};

export default function StaffPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const currentUserId = useAuthStore((s) => s.user?.id);
    const deleteUser = useDeleteUser();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
    const [statusFilter, setStatusFilter] = useState<AccountStatus | ''>('');

    const [formOpen, setFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);

    const { data, isLoading, isFetching } = useUsers({
        page,
        limit: pageSize,
        staffOnly: true,
        search: search || undefined,
        role: roleFilter || undefined,
        accountStatus: statusFilter || undefined,
    });

    const roleOptions = useMemo(
        () => [
            { value: '', label: t('user.filter.allRoles') },
            ...STAFF_ROLES.map((r) => ({ value: r, label: t(ROLE_LABELS[r]) })),
        ],
        [t],
    );
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
                currentUserId,
                onView: (u) => router.push(`/dashboard/staff/${u.id}`),
                onEdit: (u) => {
                    setEditingUser(u);
                    setFormOpen(true);
                },
                onDelete: (u) => setDeletingUser(u),
            }),
        [t, language, router, currentUserId],
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
            title={t('staffAccount.list.title')}
            subtitle={t('staffAccount.list.subtitle')}
            createLabel={t('staffAccount.action.create')}
            onCreate={() => {
                setEditingUser(null);
                setFormOpen(true);
            }}
            search={search}
            onSearchChange={(v) => {
                setSearch(v);
                setPage(1);
            }}
            searchPlaceholder={t('user.list.search')}
            filters={
                <div className="flex flex-wrap gap-2">
                    <div className="w-44">
                        <Combobox
                            options={roleOptions}
                            value={roleFilter}
                            onChange={(v) => {
                                setRoleFilter(v as UserRole | '');
                                setPage(1);
                            }}
                            placeholder={t('user.filter.role')}
                        />
                    </div>
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
            emptyTitle={t('staffAccount.list.empty')}
            emptyDescription={t('staffAccount.list.emptyHelp')}
            emptyFilteredTitle={t('user.list.noMatch')}
            hasActiveFilters={
                search !== '' || roleFilter !== '' || statusFilter !== ''
            }
        >
            <UserFormDialog
                open={formOpen}
                user={editingUser}
                mode="staff"
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditingUser(null);
                }}
            />

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
