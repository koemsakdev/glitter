'use client';

import type { ReactNode } from 'react';
import { CalendarDays } from 'lucide-react';
import { formatLongDate } from '@/lib/date-formatters';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

export function WelcomeHeader({ action }: { action?: ReactNode }) {
    const { t, language } = useI18n();
    const user = useAuthStore((s) => s.user);

    const displayName = user?.fullName || user?.email?.split('@')[0] || '';
    const today = formatLongDate(new Date(), language);

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('dashboard.welcome').replace('{name}', displayName)}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    {t('dashboard.subtitle')}
                </p>
            </div>
            {action ?? (
                <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <CalendarDays className="size-3.5" />
                    {today}
                </span>
            )}
        </div>
    );
}
