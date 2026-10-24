'use client';

import { format } from 'date-fns';
import {
    ArrowLeft,
    AtSign,
    BadgeCheck,
    CalendarDays,
    Check,
    Clock,
    Copy,
    History,
    Mail,
    Pencil,
    Phone,
    Store,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { AddressList } from '@/features/addresses/components/address-list';
import { CustomerWishlistSection } from '@/features/wishlists/components/customer-wishlist-section';
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
import { useAuditTrail } from '@/stores/use-audit-trail';
import { StaffPermissions } from '@/features/users/components/staff-permissions';

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
    const viewerIsAdmin = useAuthStore((s) => s.user?.role === 'admin');
    const showTrail = useAuditTrail((s) => s.show);

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
            {/* Back link */}
            <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="size-4" />
                {mode === 'customer'
                    ? t('nav.customers')
                    : t('nav.staffAccess')}
            </Link>

            {/* Profile header — clean card, no banner */}
            <section className="rounded-2xl border bg-card p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="shrink-0">
                        <UserAvatarUploader
                            variant="hero"
                            editable={viewerIsAdmin || isSelf}
                            userId={user.id}
                            profileImageUrl={user.profileImageUrl}
                            name={user.fullName}
                        />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="truncate text-2xl font-bold tracking-tight">
                                {user.fullName}
                            </h1>
                            {mode === 'staff' && (
                                <UserRoleBadge role={user.role} />
                            )}
                            <UserStatusBadge status={user.accountStatus} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {user.username && (
                                <span className="font-mono">
                                    @{user.username}
                                </span>
                            )}
                            {mode === 'staff' && branchName && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Store className="size-3.5" />
                                    {branchName}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <CalendarDays className="size-3.5" />
                                {t('user.detail.memberSince').replace(
                                    '{date}',
                                    format(
                                        new Date(user.createdAt),
                                        'MMM yyyy',
                                    ),
                                )}
                            </span>
                        </div>
                    </div>
                    {viewerIsAdmin && (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() =>
                                    showTrail({
                                        entity: 'users',
                                        id: user.id,
                                        label: user.fullName,
                                    })
                                }
                            >
                                <History className="size-4" />
                                {t('rowActions.auditTrail')}
                            </Button>
                            <Button
                                className="rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                                onClick={() =>
                                    mode === 'customer'
                                        ? router.push(
                                              `/dashboard/customers/${id}/edit`,
                                          )
                                        : setEditOpen(true)
                                }
                            >
                                <Pencil className="size-4" />
                                {t('user.action.edit')}
                            </Button>
                            {!isSelf && (
                                <Button
                                    variant="outline"
                                    size="icon"
                                    aria-label={t('user.action.delete')}
                                    title={t('user.action.delete')}
                                    onClick={() => setDeleteOpen(true)}
                                    className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* Contact + account details — Contact only when there is any */}
            <div
                className={`grid gap-6 ${
                    user.email || user.phoneNumber ? 'lg:grid-cols-2' : ''
                }`}
            >
                {(user.email || user.phoneNumber) && (
                    <section className="rounded-2xl border bg-card p-5">
                        <h2 className="mb-4 text-sm font-semibold">
                            {t('user.detail.contact')}
                        </h2>
                        <ul className="space-y-3">
                            <InfoRow
                                icon={Mail}
                                label={t('user.field.email')}
                                value={user.email}
                                copy
                                verified={Boolean(user.emailVerifiedAt)}
                            />
                            <InfoRow
                                icon={Phone}
                                label={t('user.field.phone')}
                                value={user.phoneNumber}
                                copy
                            />
                        </ul>
                    </section>
                )}
                <section className="rounded-2xl border bg-card p-5">
                    <h2 className="mb-4 text-sm font-semibold">
                        {t('user.detail.account')}
                    </h2>
                    <ul className="space-y-3">
                        {mode === 'staff' && (
                            <>
                                <InfoRow
                                    icon={AtSign}
                                    label={t('user.field.username')}
                                    value={user.username}
                                    mono
                                />
                                <InfoRow
                                    icon={Store}
                                    label={t('user.field.branch')}
                                    value={
                                        branchName ??
                                        (user.role === 'admin'
                                            ? t('user.detail.allBranches')
                                            : null)
                                    }
                                />
                            </>
                        )}
                        <InfoRow
                            icon={CalendarDays}
                            label={t('user.col.joined')}
                            value={format(new Date(user.createdAt), 'PPP')}
                        />
                        <InfoRow
                            icon={Clock}
                            label={t('user.detail.updated')}
                            value={format(new Date(user.updatedAt), 'PPp')}
                        />
                    </ul>
                </section>
            </div>

            {/* Permissions — admins manage what a manager/cashier may do */}
            {mode === 'staff' && viewerIsAdmin && (
                <StaffPermissions user={user} />
            )}

            {/* Login methods — only when the customer has linked accounts */}
            {mode === 'customer' && (user.linkedProviders?.length ?? 0) > 0 && (
                <div className="rounded-xl border bg-card p-5">
                    <h2 className="mb-3 text-lg font-semibold">
                        {t('user.accounts.title')}
                    </h2>
                    <ConnectedAccounts linkedProviders={user.linkedProviders} />
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

            {/* Wishlist — products this customer saved */}
            {mode === 'customer' && (
                <CustomerWishlistSection userId={user.id} />
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

/** One labelled detail with an icon chip; optional copy button. */
function InfoRow({
    icon: Icon,
    label,
    value,
    copy,
    mono,
    verified,
}: {
    icon: LucideIcon;
    label: string;
    value: string | null | undefined;
    copy?: boolean;
    mono?: boolean;
    verified?: boolean;
}) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    if (!value) return null;
    return (
        <li className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-300">
                <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p
                    className={`flex items-center gap-1.5 truncate text-sm font-medium ${
                        mono ? 'font-mono' : ''
                    } ${value ? '' : 'text-muted-foreground'}`}
                >
                    <span className="truncate">{value}</span>
                    {value && verified && (
                        <BadgeCheck
                            className="size-4 shrink-0 text-emerald-500"
                            aria-label={t('user.detail.verified')}
                        />
                    )}
                </p>
            </div>
            {copy && value && (
                <button
                    type="button"
                    onClick={() => {
                        void navigator.clipboard
                            ?.writeText(value)
                            .then(() => {
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            })
                            .catch(() => undefined);
                    }}
                    aria-label={t('common.copy')}
                    title={t('common.copy')}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                    {copied ? (
                        <Check className="size-4 text-emerald-500" />
                    ) : (
                        <Copy className="size-4" />
                    )}
                </button>
            )}
        </li>
    );
}
