'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { AlertsTab } from '@/features/audit/alerts-tab';
import { securityApi } from '@/features/audit/audit-api';
import { SignInsTab } from '@/features/audit/sign-ins-tab';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * Activity Log: who accessed the system (sign-ins) and security alerts.
 * Changes to individual records live in each row's ⋯ → Audit trail.
 */
export default function ActivityPage() {
    const { t } = useI18n();
    const [tab, setTab] = useState<'signins' | 'alerts'>('signins');
    const { data: openAlerts } = useQuery({
        queryKey: ['security-alerts', 'open-count'],
        queryFn: () => securityApi.alerts({ resolved: 'false', limit: 1 }),
        refetchInterval: 60_000,
    });
    return (
        <div className="space-y-5">
            <div className="inline-flex flex-wrap rounded-full border bg-card p-1">
                {(
                    [
                        ['signins', 'activity.tab.signins'],
                        ['alerts', 'activity.tab.alerts'],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                            tab === key
                                ? 'bg-pink-400 text-white dark:bg-pink-700'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t(label)}
                        {key === 'alerts' && (openAlerts?.open ?? 0) > 0 && (
                            <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                                {openAlerts?.open}
                            </span>
                        )}
                    </button>
                ))}
            </div>
            {tab === 'signins' ? <SignInsTab /> : <AlertsTab />}
        </div>
    );
}
