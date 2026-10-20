'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import { CheckCircle2, Lock, ShieldAlert, Unlock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { securityApi, type SecurityAlert } from '@/features/audit/audit-api';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const SEVERITY: Record<SecurityAlert['severity'], string> = {
    critical: 'bg-red-600 text-white',
    high: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    low: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
};

/** Security alerts raised automatically, plus the IPs currently blocked. */
export function AlertsTab() {
    const { t } = useI18n();
    const qc = useQueryClient();
    const [show, setShow] = useState<'false' | 'true'>('false');
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['security-alerts', show, page],
        queryFn: () => securityApi.alerts({ resolved: show, page, limit: 20 }),
        refetchInterval: 30_000,
    });
    const { data: blocks } = useQuery({
        queryKey: ['ip-blocks'],
        queryFn: securityApi.blocks,
        refetchInterval: 30_000,
    });
    const resolve = useMutation({
        mutationFn: securityApi.resolve,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['security-alerts'] }),
    });
    const lift = useMutation({
        mutationFn: securityApi.lift,
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ip-blocks'] }),
    });

    const typeLabel = (type: string) => {
        const key = `alerts.type.${type}` as TranslationKey;
        const label = t(key);
        return label === key ? type : label;
    };
    const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">{t('alerts.title')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('alerts.subtitle')}</p>
            </div>

            {/* Blocked IPs */}
            <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                    <Lock className="size-4 text-red-500" />
                    {t('alerts.blockedIps')}
                    <span className="text-muted-foreground">({blocks?.length ?? 0})</span>
                </div>
                {!blocks?.length ? (
                    <p className="mt-2 text-sm text-muted-foreground">{t('alerts.noBlocks')}</p>
                ) : (
                    <ul className="mt-2 divide-y text-sm">
                        {blocks.map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                                <span className="font-mono font-medium">{b.ip}</span>
                                <span className="rounded-full bg-muted px-2 text-xs">{typeLabel(b.reason)}</span>
                                <span className="text-xs text-muted-foreground">
                                    {t('alerts.until').replace('{time}', format(new Date(b.blockedUntil), 'p'))}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="ml-auto h-7"
                                    disabled={lift.isPending}
                                    onClick={() => lift.mutate(b.ip)}
                                >
                                    <Unlock className="mr-1 size-3.5" />
                                    {t('alerts.lift')}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Alerts */}
            <div className="inline-flex rounded-full border bg-card p-1 text-sm">
                {(
                    [
                        ['false', 'alerts.open'],
                        ['true', 'alerts.resolved'],
                    ] as const
                ).map(([v, k]) => (
                    <button
                        key={v}
                        type="button"
                        onClick={() => {
                            setShow(v);
                            setPage(1);
                        }}
                        className={cn(
                            'rounded-full px-4 py-1.5 font-medium',
                            show === v ? 'bg-muted text-foreground' : 'text-muted-foreground',
                        )}
                    >
                        {t(k)}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
                    ))}
                </div>
            ) : !data?.data.length ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed py-12 text-center text-sm text-muted-foreground">
                    <CheckCircle2 className="size-8 text-emerald-500" />
                    {show === 'false' ? t('alerts.allClear') : t('alerts.noneResolved')}
                </div>
            ) : (
                <div className="space-y-2">
                    {data.data.map((a) => (
                        <div key={a.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-start">
                            <ShieldAlert className={cn('size-5 shrink-0', a.severity === 'low' ? 'text-zinc-400' : a.severity === 'medium' ? 'text-amber-500' : 'text-red-500')} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', SEVERITY[a.severity])}>
                                        {t(`alerts.severity.${a.severity}` as TranslationKey)}
                                    </span>
                                    <span className="font-semibold">{typeLabel(a.alertType)}</span>
                                    <span className="text-xs text-muted-foreground" title={format(new Date(a.createdAt), 'PPpp')}>
                                        {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="mt-1 text-sm">{a.details}</p>
                                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    {a.userName && <span>{t('alerts.user')}: {a.userName}</span>}
                                    {a.ipAddress && <span className="font-mono">IP {a.ipAddress}</span>}
                                    {a.actionTaken !== 'none' && (
                                        <span className="font-medium text-red-600 dark:text-red-400">
                                            {t('alerts.actionTaken')}: {a.actionTaken.replace(/_/g, ' ')}
                                        </span>
                                    )}
                                    {a.isResolved && a.resolvedByName && (
                                        <span className="text-emerald-600">
                                            {t('alerts.resolvedBy')
                                                .replace('{name}', a.resolvedByName)
                                                .replace('{time}', a.resolvedAt ? format(new Date(a.resolvedAt), 'PP p') : '')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!a.isResolved && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={resolve.isPending}
                                    onClick={() => resolve.mutate(a.id)}
                                    className="shrink-0"
                                >
                                    <CheckCircle2 className="mr-1.5 size-4" />
                                    {t('alerts.resolve')}
                                </Button>
                            )}
                        </div>
                    ))}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 pt-2 text-sm">
                            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹</Button>
                            <span className="text-muted-foreground">{page} / {totalPages}</span>
                            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>›</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
