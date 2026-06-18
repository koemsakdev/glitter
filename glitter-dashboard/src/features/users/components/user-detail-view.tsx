'use client';

import { format } from 'date-fns';
import { ArrowLeft, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DetailField, DetailSection } from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { AddressList } from '@/features/addresses/components/address-list';
import { ConnectedAccounts } from '@/features/users/components/connected-accounts';
import { UserAvatarUploader } from '@/features/users/components/user-avatar-uploader';
import {
    UserRoleBadge,
    UserStatusBadge,
} from '@/features/users/components/user-badges';
import { UserFormDialog } from '@/features/users/components/user-form-dialog';
import { useDeleteUser, useUser } from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

interface UserDetailViewProps {
    id: string;
    backHref?: string;
    mode?: 'customer' | 'staff';
}

export function UserDetailView({
    id,
    backHref = '/dashboard/users',
    mode = 'staff',
}: UserDetailViewProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const currentUserId = useAuthStore((s) => s.user?.id);
    const isSelf = currentUserId === id;

    const { data: user, isLoading, isError, refetch } = useUser(id);
    const deleteUser = useDeleteUser();

    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    if (isLoading) {
        return <LoadingScreen variant="page" />;
    }

    if (isError || !user) {
        return (
            <ErrorState
                title={t('user.detail.errorTitle')}
                message={t('user.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const branchName = user.branch
        ? language === 'km'
            ? user.branch.branchNameKm
            : user.branch.branchNameEn
        : null;

    async function handleDelete() {
        try {
            await deleteUser.mutateAsync(id);
            toast({ title: t('user.delete.success'), variant: 'success' });
            router.push(backHref);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                    <UserAvatarUploader
                        userId={user.id}
                        profileImageUrl={user.profileImageUrl}
                        name={user.fullName}
                    />
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {user.fullName}
                        </h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {mode === 'staff' && (
                                <UserRoleBadge role={user.role} />
                            )}
                            <UserStatusBadge status={user.accountStatus} />
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href={backHref}>
                                <ArrowLeft className="mr-2 size-4" />
                                {t('common.back')}
                            </Link>
                        }
                    />
                    <Button
                        variant="outline"
                        onClick={() =>
                            mode === 'customer'
                                ? router.push(`/dashboard/customers/${id}/edit`)
                                : setEditOpen(true)
                        }
                    >
                        <Pencil className="mr-2 size-4" />
                        {t('user.action.edit')}
                    </Button>
                    {!isSelf && (
                    <Button
                        variant="outline"
                        onClick={() => setDeleteOpen(true)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4" />
                        {t('user.action.delete')}
                    </Button>
                    )}
                </div>
            </div>

            {/* Information */}
            <DetailSection title={t('user.detail.information')}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField label={t('user.field.email')}>
                        {user.email ? (
                            <span className="inline-flex items-center gap-1.5">
                                <Mail className="size-3.5 text-muted-foreground" />
                                {user.email}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </DetailField>
                    <DetailField label={t('user.field.phone')}>
                        {user.phoneNumber ? (
                            <span className="inline-flex items-center gap-1.5">
                                <Phone className="size-3.5 text-muted-foreground" />
                                {user.phoneNumber}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </DetailField>
                    {mode === 'staff' && (
                        <>
                            <DetailField label={t('user.field.role')}>
                                <UserRoleBadge role={user.role} />
                            </DetailField>
                            <DetailField label={t('user.field.branch')}>
                                {branchName ?? (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </DetailField>
                        </>
                    )}
                    <DetailField label={t('user.col.joined')}>
                        {format(new Date(user.createdAt), 'PPP')}
                    </DetailField>
                </dl>
            </DetailSection>

            {/* Login methods — only when the customer has linked accounts */}
            {mode === 'customer' &&
                (user.linkedProviders?.length ?? 0) > 0 && (
                    <div className="rounded-xl border bg-card p-5">
                        <h2 className="mb-3 text-lg font-semibold">
                            {t('user.accounts.title')}
                        </h2>
                        <ConnectedAccounts
                            linkedProviders={user.linkedProviders}
                        />
                    </div>
                )}

            {/* Addresses — customers can add/edit here too */}
            {mode === 'customer' && (
                <div className="rounded-xl border bg-card p-5">
                    <AddressList
                        userId={user.id}
                        customerName={user.fullName}
                        customerPhone={user.phoneNumber ?? undefined}
                    />
                </div>
            )}

            <UserFormDialog
                key={user.id}
                open={editOpen}
                user={user}
                mode={mode}
                onOpenChange={setEditOpen}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t('user.delete.title')}
                description={t('user.delete.message').replace(
                    '{name}',
                    user.fullName,
                )}
                confirmLabel={t('user.delete.confirm')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={deleteUser.isPending}
                onConfirm={handleDelete}
            />
        </div>
    );
}
