'use client';

import { Check, Crown, Minus, ShoppingCart, Store, type LucideIcon } from 'lucide-react';
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
 * What each role can do — keep in step with the API's @Roles rules and
 * src/config/navigation.ts (which hides pages a role can't open).
 */
export const ACCESS_MATRIX: { labelKey: TranslationKey; roles: StaffRole[] }[] = [
    { labelKey: 'role.can.sell', roles: ['admin', 'manager', 'cashier'] },
    { labelKey: 'role.can.shipments', roles: ['admin', 'manager', 'cashier'] },
    { labelKey: 'role.can.cancelRefund', roles: ['admin', 'manager'] },
    { labelKey: 'role.can.checkStock', roles: ['admin', 'manager', 'cashier'] },
    { labelKey: 'role.can.inventory', roles: ['admin', 'manager'] },
    { labelKey: 'role.can.reviews', roles: ['admin', 'manager'] },
    { labelKey: 'role.can.reports', roles: ['admin', 'manager'] },
    // One shared catalog for every branch — admin only, so branches can't
    // create duplicate products.
    { labelKey: 'role.can.catalog', roles: ['admin'] },
    { labelKey: 'role.can.promotions', roles: ['admin'] },
    { labelKey: 'role.can.customers', roles: ['admin'] },
    { labelKey: 'role.can.branches', roles: ['admin'] },
    { labelKey: 'role.can.settings', roles: ['admin'] },
    { labelKey: 'role.can.staff', roles: ['admin'] },
    { labelKey: 'role.can.activity', roles: ['admin'] },
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
    return (
        <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
            {ROLE_INFO.map((r) => {
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
                            {on && <Check className="ml-auto size-4 text-pink-500" />}
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

/** "What each role can do" — a compact ✓ table for the Staff page. */
export function RoleAccessGuide() {
    const { t } = useI18n();
    return (
        <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <p className="text-sm font-semibold">{t('role.guide.title')}</p>
                <p className="text-xs text-muted-foreground">
                    {t('role.guide.subtitle')}
                </p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/40 text-xs">
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                                {t('role.guide.feature')}
                            </th>
                            {ROLE_INFO.map((r) => (
                                <th key={r.role} className="px-3 py-2 font-medium">
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
                            <tr key={row.labelKey} className="border-b last:border-0">
                                <td className="px-4 py-2">{t(row.labelKey)}</td>
                                {ROLE_INFO.map((r) => (
                                    <td key={r.role} className="px-3 py-2 text-center">
                                        {row.roles.includes(r.role) ? (
                                            <Check className="mx-auto size-4 text-emerald-500" />
                                        ) : (
                                            <Minus className="mx-auto size-4 text-muted-foreground/40" />
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
