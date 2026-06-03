'use client';

import { formatLongDate } from '@/lib/date-formatters';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';

export function WelcomeHeader() {
    const { t, language } = useI18n();
    const user = useAuthStore((s) => s.user);

    const displayName = user?.fullName || user?.email?.split('@')[0] || '';
    const today = formatLongDate(new Date(), language);
    const todayPrefix = t('dashboard.todayIs');

    return (
        <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t('dashboard.welcome').replace('{name}', displayName)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                {todayPrefix} {today} · {t('dashboard.subtitle')}
            </p>
        </div>
    );
}