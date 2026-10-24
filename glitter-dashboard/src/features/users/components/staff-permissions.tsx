'use client';

import {
    BarChart3,
    Lock,
    Loader2,
    Megaphone,
    Package,
    Receipt,
    ShieldCheck,
    Star,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
    usePermissionCatalog,
    useSetUserPermissions,
} from '@/features/users/use-users';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { User } from '@/types/user';

const GROUP_ICON: Record<string, LucideIcon> = {
    catalog: Package,
    sales: Receipt,
    reviews: Star,
    storefront: Megaphone,
    insights: BarChart3,
};

/** Granting these raises a security alert (mirrors the API's HIGH_RISK). */
const HIGH_RISK = new Set([
    'products.delete',
    'storefront.manage',
    'promotions.manage',
    'reviews.delete',
]);

const ROLE_KEY: Record<string, TranslationKey> = {
    manager: 'user.role.manager',
    cashier: 'user.role.cashier',
};

/**
 * Admin panel on a staff member's page: their role's built-in permissions
 * (locked on) plus extras the admin can switch on. Admin-only features are
 * listed so it's clear they can never be granted.
 */
export function StaffPermissions({ user }: { user: User }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data: catalog, isLoading } = usePermissionCatalog();
    const save = useSetUserPermissions();

    const saved = user.extraPermissions ?? [];
    const [extras, setExtras] = useState<string[]>(saved);
    // Re-sync when another user is opened or after saving.
    const savedKey = saved.join(',');
    const [lastSaved, setLastSaved] = useState(savedKey);
    if (lastSaved !== savedKey) {
        setLastSaved(savedKey);
        setExtras(saved);
    }

    if (user.role === 'admin') {
        return (
            <section className="flex items-center gap-3 rounded-xl border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="size-5" />
                </span>
                <div>
                    <h2 className="text-base font-semibold">
                        {t('perm.panel.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {t('perm.panel.adminAll')}
                    </p>
                </div>
            </section>
        );
    }

    const defaults = catalog?.roleDefaults[user.role] ?? [];
    const dirty = [...extras].sort().join(',') !== [...saved].sort().join(',');
    const roleName = ROLE_KEY[user.role] ? t(ROLE_KEY[user.role]) : user.role;

    function toggle(p: string, on: boolean) {
        setExtras((cur) =>
            on ? [...new Set([...cur, p])] : cur.filter((x) => x !== p),
        );
    }

    async function onSave() {
        try {
            await save.mutateAsync({ id: user.id, permissions: extras });
            toast({
                variant: 'success',
                title: t('perm.panel.saved'),
                description: user.fullName,
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('common.toast.error'),
                description: getErrorMessage(error),
            });
        }
    }

    return (
        <section className="overflow-hidden rounded-xl border bg-card">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-300">
                        <ShieldCheck className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold">
                            {t('perm.panel.title')}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {t('perm.panel.subtitle').replace(
                                '{role}',
                                roleName,
                            )}
                        </p>
                    </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                    {t('perm.panel.extraCount').replace(
                        '{n}',
                        String(saved.length),
                    )}
                </span>
            </header>

            {isLoading || !catalog ? (
                <div className="flex justify-center p-10">
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="divide-y">
                    {catalog.groups.map((g) => {
                        const Icon = GROUP_ICON[g.id] ?? Package;
                        return (
                            <div key={g.id} className="px-5 py-4">
                                <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <Icon className="size-3.5" />
                                    {t(`perm.group.${g.id}` as TranslationKey)}
                                </p>
                                <ul className="space-y-3">
                                    {g.permissions.map((p) => {
                                        const builtIn = defaults.includes(p);
                                        const on =
                                            builtIn || extras.includes(p);
                                        return (
                                            <li
                                                key={p}
                                                className="flex items-start justify-between gap-4"
                                            >
                                                <div className="min-w-0">
                                                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                                        {t(
                                                            `perm.${p}.title` as TranslationKey,
                                                        )}
                                                        {builtIn && (
                                                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                                {t(
                                                                    'perm.panel.withRole',
                                                                ).replace(
                                                                    '{role}',
                                                                    roleName,
                                                                )}
                                                            </span>
                                                        )}
                                                        {!builtIn &&
                                                            HIGH_RISK.has(
                                                                p,
                                                            ) && (
                                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                                                                    {t(
                                                                        'perm.panel.highRisk',
                                                                    )}
                                                                </span>
                                                            )}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {t(
                                                            `perm.${p}.desc` as TranslationKey,
                                                        )}
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={on}
                                                    disabled={
                                                        builtIn ||
                                                        save.isPending
                                                    }
                                                    onCheckedChange={(v) =>
                                                        toggle(p, v)
                                                    }
                                                    aria-label={t(
                                                        `perm.${p}.title` as TranslationKey,
                                                    )}
                                                />
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}

                    {/* Never grantable */}
                    <div className="bg-muted/30 px-5 py-4">
                        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <Lock className="size-3.5" />
                            {t('perm.panel.adminOnlyTitle')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {catalog.adminOnly.map((f) => (
                                <span
                                    key={f}
                                    className="inline-flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground"
                                >
                                    <Lock className="size-3" />
                                    {t(`perm.adminOnly.${f}` as TranslationKey)}
                                </span>
                            ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {t('perm.panel.branchNote')}
                        </p>
                    </div>
                </div>
            )}

            {/* Save bar — only when something changed */}
            <div
                className={cn(
                    'flex items-center justify-end gap-2 border-t bg-muted/30 px-5 py-3',
                    !dirty && 'hidden',
                )}
            >
                <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={save.isPending}
                    onClick={() => setExtras(saved)}
                >
                    {t('perm.panel.discard')}
                </Button>
                <Button
                    size="sm"
                    className="rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                    disabled={save.isPending}
                    onClick={onSave}
                >
                    {save.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                    )}
                    {t('perm.panel.save')}
                </Button>
            </div>
        </section>
    );
}
