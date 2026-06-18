'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';

const BASE = '/dashboard/app-settings';

const TABS: { href: string; label: string }[] = [
    { href: `${BASE}/general`, label: 'General' },
    { href: `${BASE}/appearance`, label: 'Appearance' },
    { href: `${BASE}/home`, label: 'Home' },
    { href: `${BASE}/banners`, label: 'Banners' },
    { href: `${BASE}/sections`, label: 'Sections' },
];

export default function AppSettingsLayout({
    children,
}: {
    children: ReactNode;
}) {
    const pathname = usePathname();
    const { t } = useI18n();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('nav.appSettings')}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('settings.subtitle')}
                </p>
            </div>

            <div className="flex flex-wrap gap-1 border-b">
                {TABS.map((tab) => {
                    const active = pathname === tab.href;
                    return (
                        <Link
                            key={tab.href}
                            href={tab.href}
                            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                                active
                                    ? 'border-pink-500 text-pink-600 dark:text-pink-300'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </div>

            {children}
        </div>
    );
}
