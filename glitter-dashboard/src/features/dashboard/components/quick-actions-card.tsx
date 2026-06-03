'use client';

import { FolderTree, Package, Plus, Tag } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export function QuickActionsCard() {
    const { t } = useI18n();

    const actions = [
        {
            href: '/dashboard/products/new',
            icon: Package,
            label: t('dashboard.quickActions.newProduct'),
            iconColor: 'text-pink-600 dark:text-pink-300',
            iconBg: 'bg-pink-100 dark:bg-pink-500/15',
        },
        {
            href: '/dashboard/brands?create-brand=true',
            icon: Tag,
            label: t('dashboard.quickActions.newBrand'),
            iconColor: 'text-blue-600 dark:text-blue-300',
            iconBg: 'bg-blue-100 dark:bg-blue-500/15',
        },
        {
            href: '/dashboard/categories?create-category=true',
            icon: FolderTree,
            label: t('dashboard.quickActions.newCategory'),
            iconColor: 'text-amber-600 dark:text-amber-300',
            iconBg: 'bg-amber-100 dark:bg-amber-500/15',
        },
    ];

    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">
                    {t('dashboard.quickActions.title')}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                    {t('dashboard.quickActions.subtitle')}
                </p>
            </div>

            <div className="flex flex-col gap-1 p-2">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <Link
                            key={action.href}
                            href={action.href}
                            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40"
                        >
                            <div
                                className={`flex size-8 shrink-0 items-center justify-center rounded-md ${action.iconBg}`}
                            >
                                <Icon className={`size-4 ${action.iconColor}`} />
                            </div>
                            <span className="flex-1 text-xs font-medium">{action.label}</span>
                            <Plus className="size-3.5 text-muted-foreground transition-transform group-hover:rotate-90" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}