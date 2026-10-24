'use client';

import {
    Check,
    ChevronDown,
    Crown,
    Lock,
    ShoppingCart,
    Store,
    type LucideIcon,
} from 'lucide-react';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

type StaffRole = Exclude<UserRole, 'customer'>;

/** The three dashboard roles, most access first. */
export const ROLE_INFO: {
    role: StaffRole;
    icon: LucideIcon;
    titleKey: TranslationKey;
    summaryKey: TranslationKey;
    tone: string;
}[] = [
    {
        role: 'admin',
        icon: Crown,
        titleKey: 'user.role.admin',
        summaryKey: 'role.admin.summary',
        tone: 'text-pink-600 bg-pink-100 dark:text-pink-300 dark:bg-pink-500/15',
    },
    {
        role: 'manager',
        icon: Store,
        titleKey: 'user.role.manager',
        summaryKey: 'role.manager.summary',
        tone: 'text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-500/15',
    },
    {
        role: 'cashier',
        icon: ShoppingCart,
        titleKey: 'user.role.cashier',
        summaryKey: 'role.cashier.summary',
        tone: 'text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-500/15',
    },
];

/**
 * What managers and cashiers can do — mirrors the API (auth/permissions.ts):
 *   Y = always part of the role · G = the admin can grant it to one person ·
 *   N = admin only, never grantable. Admins can do everything.
 */
type Access = 'Y' | 'G' | 'N';
export const ACCESS_MATRIX: {
    labelKey: TranslationKey;
    manager: Access;
    cashier: Access;
}[] = [
    { labelKey: 'role.can.sell', manager: 'Y', cashier: 'Y' },
    { labelKey: 'role.can.shipments', manager: 'Y', cashier: 'Y' },
    { labelKey: 'role.can.checkStock', manager: 'Y', cashier: 'Y' },
    { labelKey: 'role.can.cancelRefund', manager: 'Y', cashier: 'G' },
    { labelKey: 'role.can.inventory', manager: 'Y', cashier: 'G' },
    { labelKey: 'role.can.reviews', manager: 'Y', cashier: 'G' },
    { labelKey: 'role.can.reports', manager: 'Y', cashier: 'G' },
    { labelKey: 'role.can.editProducts', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.deleteProducts', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.catalog', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.promotions', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.customers', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.deleteReviews', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.settings', manager: 'G', cashier: 'G' },
    { labelKey: 'role.can.staff', manager: 'N', cashier: 'N' },
    { labelKey: 'role.can.branches', manager: 'N', cashier: 'N' },
    { labelKey: 'role.can.activity', manager: 'N', cashier: 'N' },
    { labelKey: 'role.can.recycleBin', manager: 'N', cashier: 'N' },
    { labelKey: 'role.can.payments', manager: 'N', cashier: 'N' },
];

/** Role picker for the staff form: one card per role with what it can do. */
export function RoleOptionCards({
    value,
    onChange,
    disabled,
}: {
    value: UserRole;
    onChange: (role: StaffRole) => void;
    disabled?: boolean;
}) {
    const { t } = useI18n();
    // There's only ONE admin (the owner). The Admin card only shows when
    // looking at that admin; new staff are managers or cashiers.
    const options = ROLE_INFO.filter(
        (r) => r.role !== 'admin' || value === 'admin',
    );
    return (
        <div
            role="radiogroup"
            className={cn(
                'grid gap-2',
                options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2',
            )}
        >
            {options.map((r) => {
                const on = value === r.role;
                return (
                    <button
                        key={r.role}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        disabled={disabled}
                        onClick={() => onChange(r.role)}
                        className={cn(
                            'flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                            on
                                ? 'border-pink-400 bg-pink-50/60 ring-2 ring-pink-400/30 dark:border-pink-600 dark:bg-pink-500/10'
                                : 'hover:bg-accent',
                        )}
                    >
                        <span className="flex w-full items-center gap-2">
                            <span
                                className={cn(
                                    'flex size-7 items-center justify-center rounded-lg',
                                    r.tone,
                                )}
                            >
                                <r.icon className="size-4" />
                            </span>
                            <span className="text-sm font-semibold">
                                {t(r.titleKey)}
                            </span>
                            {on && (
                                <Check className="ml-auto size-4 text-pink-500" />
                            )}
                        </span>
                        <span className="text-xs leading-snug text-muted-foreground">
                            {t(r.summaryKey)}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** One cell of the guide: ✓ always · "Can grant" · 🔒 admin only. */
function AccessCell({ value }: { value: Access }) {
    const { t } = useI18n();
    if (value === 'Y')
        return <Check className="mx-auto size-4 text-emerald-500" />;
    if (value === 'G')
        return (
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                {t('role.guide.canGrant')}
            </span>
        );
    return (
        <Lock
            className="mx-auto size-3.5 text-muted-foreground/50"
            aria-label={t('role.guide.adminOnly')}
        />
    );
}

/**
 * "What each role can do" on the Staff page — collapsed by default.
 * Admin column is always ✓; the guide is really about managers/cashiers.
 */
export function RoleAccessGuide() {
    const { t } = useI18n();
    return (
        <details className="group overflow-hidden rounded-xl border bg-card [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                        {t('role.guide.title')}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                        {t('role.guide.subtitle')}
                    </span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40 text-xs">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                                {t('role.guide.feature')}
                            </th>
                            {ROLE_INFO.map((r) => (
                                <th
                                    key={r.role}
                                    className="px-3 py-2 font-medium"
                                >
                                    <span className="inline-flex items-center gap-1.5">
                                        <span
                                            className={cn(
                                                'flex size-5 items-center justify-center rounded-md',
                                                r.tone,
                                            )}
                                        >
                                            <r.icon className="size-3" />
                                        </span>
                                        {t(r.titleKey)}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ACCESS_MATRIX.map((row) => (
                            <tr
                                key={row.labelKey}
                                className="border-b last:border-0"
                            >
                                <td className="px-4 py-2">{t(row.labelKey)}</td>
                                <td className="px-3 py-2 text-center">
                                    <AccessCell value="Y" />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <AccessCell value={row.manager} />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    <AccessCell value={row.cashier} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-500" />
                    {t('role.guide.legendAlways')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                        {t('role.guide.canGrant')}
                    </span>
                    {t('role.guide.legendGrant')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Lock className="size-3 text-muted-foreground/60" />
                    {t('role.guide.adminOnly')}
                </span>
            </div>
        </details>
    );
}
