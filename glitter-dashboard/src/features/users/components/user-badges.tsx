'use client';

import { Badge } from '@/components/ui/badge';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { AccountStatus, UserRole } from '@/types/user';

const ROLE_STYLES: Record<UserRole, string> = {
    customer:
        'bg-zinc-100 text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-300 dark:hover:bg-zinc-500/15',
    cashier:
        'bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/15',
    manager:
        'bg-indigo-100 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/15',
    admin:
        'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15',
    super_admin:
        'bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-500/15 dark:text-purple-300 dark:hover:bg-purple-500/15',
};

const ROLE_LABELS: Record<UserRole, TranslationKey> = {
    customer: 'user.role.customer',
    cashier: 'user.role.cashier',
    manager: 'user.role.manager',
    admin: 'user.role.admin',
    super_admin: 'user.role.super_admin',
};

const STATUS_STYLES: Record<AccountStatus, { bg: string; dot: string }> = {
    active: {
        bg: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15',
        dot: 'bg-emerald-500 dark:bg-emerald-400',
    },
    suspended: {
        bg: 'bg-amber-100 text-amber-800 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15',
        dot: 'bg-amber-500 dark:bg-amber-400',
    },
    deleted: {
        bg: 'bg-zinc-100 text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-500/15 dark:text-zinc-400 dark:hover:bg-zinc-500/15',
        dot: 'bg-zinc-400 dark:bg-zinc-500',
    },
};

const STATUS_LABELS: Record<AccountStatus, TranslationKey> = {
    active: 'user.status.active',
    suspended: 'user.status.suspended',
    deleted: 'user.status.deleted',
};

export function UserRoleBadge({ role }: { role: UserRole }) {
    const { t } = useI18n();
    return <Badge className={ROLE_STYLES[role]}>{t(ROLE_LABELS[role])}</Badge>;
}

export function UserStatusBadge({ status }: { status: AccountStatus }) {
    const { t } = useI18n();
    const style = STATUS_STYLES[status];
    return (
        <Badge className={style.bg}>
            <span className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`} />
            {t(STATUS_LABELS[status])}
        </Badge>
    );
}
