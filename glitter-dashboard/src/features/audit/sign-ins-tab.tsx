'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Bot,
    CheckCircle2,
    Globe2,
    Laptop,
    MapPin,
    Monitor,
    ShieldAlert,
    Smartphone,
    Tablet,
    X,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResourceList } from '@/components/resource/resource-list';
import { Combobox } from '@/components/ui/combobox';
import { loginApi, type LoginAttempt } from '@/features/audit/audit-api';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const REASONS: Record<string, TranslationKey> = {
    unknown_user: 'signins.reason.unknown_user',
    wrong_password: 'signins.reason.wrong_password',
    not_staff: 'signins.reason.not_staff',
    no_password: 'signins.reason.no_password',
    suspended: 'signins.reason.suspended',
    deleted: 'signins.reason.deleted',
};

const DEVICE_ICON: Record<string, LucideIcon> = {
    desktop: Monitor,
    mobile: Smartphone,
    tablet: Tablet,
    bot: Bot,
};

/** 🇰🇭-style flag from a 2-letter country code. */
function flag(code: string | null): string {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
        ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
    );
}

function place(l: Pick<LoginAttempt, 'city' | 'region' | 'country'>): string {
    return [l.city, l.region !== l.city ? l.region : null, l.country]
        .filter(Boolean)
        .join(', ');
}

export function SignInsTab() {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [result, setResult] = useState<'' | 'true' | 'false'>('');
    const [ip, setIp] = useState('');
    const [open, setOpen] = useState<LoginAttempt | null>(null);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['login-attempts', page, pageSize, search, result, ip],
        queryFn: () =>
            loginApi.list({
                page,
                limit: pageSize,
                search: search || undefined,
                success: result || undefined,
                ip: ip || undefined,
            }),
        placeholderData: keepPreviousData,
        refetchInterval: 30_000,
    });
    const { data: summary } = useQuery({
        queryKey: ['login-attempts', 'summary'],
        queryFn: loginApi.summary,
        refetchInterval: 60_000,
    });

    const columns = useMemo<ColumnDef<LoginAttempt, unknown>[]>(
        () => [
            {
                accessorKey: 'createdAt',
                header: t('activity.col.when'),
                cell: ({ row }) => {
                    const d = new Date(row.original.createdAt);
                    return (
                        <div className="whitespace-nowrap">
                            <div className="text-sm">{formatDistanceToNow(d, { addSuffix: true })}</div>
                            <div className="text-xs text-muted-foreground">{format(d, 'PP p')}</div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'success',
                header: t('signins.col.result'),
                cell: ({ row }) => {
                    const l = row.original;
                    return l.success ? (
                        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5" />
                            {t('signins.success')}
                        </span>
                    ) : (
                        <div>
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                <XCircle className="size-3.5" />
                                {t('signins.failed')}
                            </span>
                            {l.failureReason && (
                                <div className="mt-0.5 text-xs text-muted-foreground">
                                    {REASONS[l.failureReason] ? t(REASONS[l.failureReason]) : l.failureReason}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'usernameTried',
                header: t('signins.col.account'),
                cell: ({ row }) => {
                    const l = row.original;
                    return (
                        <div className="min-w-0 max-w-44">
                            <div className="truncate text-sm font-medium">{l.userName ?? '—'}</div>
                            <div className="truncate font-mono text-xs text-muted-foreground">{l.usernameTried}</div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'ip',
                header: t('signins.col.ip'),
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={() => {
                            setIp(row.original.ip);
                            setPage(1);
                        }}
                        title={t('signins.filterByIp')}
                        className="whitespace-nowrap font-mono text-sm hover:text-pink-600 hover:underline"
                    >
                        {row.original.ip}
                    </button>
                ),
            },
            {
                accessorKey: 'country',
                header: t('signins.col.location'),
                cell: ({ row }) => {
                    const l = row.original;
                    if (!l.country) {
                        return <span className="text-xs text-muted-foreground">{t('signins.locating')}</span>;
                    }
                    return (
                        <div className="min-w-0 max-w-52">
                            <div className="truncate text-sm">
                                <span className="mr-1">{flag(l.countryCode)}</span>
                                {place(l)}
                            </div>
                            {l.isp && <div className="truncate text-xs text-muted-foreground">{l.isp}</div>}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'browser',
                header: t('signins.col.device'),
                cell: ({ row }) => {
                    const l = row.original;
                    const Icon = DEVICE_ICON[l.deviceType ?? ''] ?? Laptop;
                    return (
                        <div className={cn('flex items-center gap-2', l.deviceType === 'bot' && 'text-red-600 dark:text-red-400')}>
                            <Icon className="size-4 shrink-0" />
                            <div className="min-w-0">
                                <div className="truncate text-sm">{l.browser ?? t('signins.unknownBrowser')}</div>
                                <div className="truncate text-xs text-muted-foreground">{l.os ?? '—'}</div>
                            </div>
                        </div>
                    );
                },
            },
            {
                id: 'more',
                header: '',
                cell: ({ row }) => (
                    <button
                        type="button"
                        onClick={() => setOpen(row.original)}
                        className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10"
                    >
                        {t('signins.details')}
                    </button>
                ),
            },
        ],
        [t],
    );

    return (
        <div className="space-y-6">
            {/* Alerts for the last 24 hours */}
            {summary && (
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border bg-card p-4">
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('signins.last24h')}</div>
                        <div className="mt-2 flex items-end gap-4">
                            <div>
                                <div className="text-2xl font-bold text-emerald-600 tabular-nums">{summary.last24h.successful}</div>
                                <div className="text-xs text-muted-foreground">{t('signins.success')}</div>
                            </div>
                            <div>
                                <div className={cn('text-2xl font-bold tabular-nums', summary.last24h.failed > 0 ? 'text-red-600' : 'text-muted-foreground')}>
                                    {summary.last24h.failed}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {t('signins.failed')} · {t('signins.fromIps').replace('{n}', String(summary.last24h.failedIps))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-card p-4 md:col-span-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <ShieldAlert className="size-3.5 text-red-500" />
                            {t('signins.suspicious')}
                        </div>
                        {summary.topFailingIps.length === 0 && summary.newCountrySignIns.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">{t('signins.allClear')}</p>
                        ) : (
                            <ul className="mt-2 space-y-1.5 text-sm">
                                {summary.topFailingIps.map((r) => (
                                    <li key={r.ip} className="flex flex-wrap items-center gap-x-2">
                                        <button type="button" onClick={() => { setIp(r.ip); setPage(1); }} className="font-mono font-medium hover:text-pink-600 hover:underline">
                                            {r.ip}
                                        </button>
                                        <span className={cn('rounded-full px-2 text-xs font-semibold', r.attempts >= 5 ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300')}>
                                            {t('signins.failedTimes').replace('{n}', String(r.attempts))}
                                        </span>
                                        <span className="text-muted-foreground">{[r.city, r.country].filter(Boolean).join(', ')}</span>
                                        <span className="truncate text-xs text-muted-foreground">{t('signins.tried')}: {r.usernames}</span>
                                    </li>
                                ))}
                                {summary.newCountrySignIns.map((r) => (
                                    <li key={`${r.userName}-${r.at}`} className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                        <Globe2 className="size-4" />
                                        {t('signins.newCountry')
                                            .replace('{name}', r.userName)
                                            .replace('{place}', [r.city, r.country].filter(Boolean).join(', '))}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            <ResourceList
                title={t('signins.title')}
                subtitle={t('signins.subtitle')}
                search={search}
                onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                }}
                searchPlaceholder={t('signins.search')}
                filters={
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="w-40">
                            <Combobox
                                options={[
                                    { value: '', label: t('signins.allResults') },
                                    { value: 'false', label: t('signins.failed') },
                                    { value: 'true', label: t('signins.success') },
                                ]}
                                value={result}
                                onChange={(v) => {
                                    setResult(v as '' | 'true' | 'false');
                                    setPage(1);
                                }}
                                placeholder={t('signins.allResults')}
                            />
                        </div>
                        {ip && (
                            <button type="button" onClick={() => setIp('')} className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 font-mono text-xs text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                                IP {ip}
                                <X className="size-3" />
                            </button>
                        )}
                    </div>
                }
                columns={columns}
                data={data?.data ?? []}
                isLoading={isLoading}
                isFetching={isFetching}
                page={page}
                pageSize={pageSize}
                total={data?.total ?? 0}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                    setPageSize(s);
                    setPage(1);
                }}
                emptyTitle={t('signins.empty')}
                emptyFilteredTitle={t('activity.noMatch')}
                hasActiveFilters={Boolean(search || result || ip)}
            />

            {/* Details panel */}
            {open && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(null)}>
                    <div className="h-full w-full max-w-md overflow-y-auto bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-lg font-semibold">{t('signins.details')}</p>
                            <button type="button" onClick={() => setOpen(null)} className="rounded-full p-1 hover:bg-accent">
                                <X className="size-4" />
                            </button>
                        </div>
                        <dl className="space-y-3 text-sm">
                            {(
                                [
                                    [t('activity.col.when'), format(new Date(open.createdAt), 'PPpp')],
                                    [t('signins.col.result'), open.success ? t('signins.success') : `${t('signins.failed')} — ${open.failureReason ? (REASONS[open.failureReason] ? t(REASONS[open.failureReason]) : open.failureReason) : ''}`],
                                    [t('signins.col.account'), `${open.userName ?? '—'} (${open.usernameTried})${open.userRole ? ` · ${open.userRole}` : ''}`],
                                    [t('signins.col.ip'), open.ip],
                                    [t('signins.forwardedFor'), open.forwardedFor],
                                    [t('signins.col.location'), `${flag(open.countryCode)} ${place(open)}`.trim() || null],
                                    [t('signins.isp'), open.isp],
                                    [t('signins.ipTimezone'), open.ipTimezone],
                                    [t('signins.col.device'), [open.browser, open.os, open.deviceType].filter(Boolean).join(' · ')],
                                    [t('signins.userAgent'), open.userAgent],
                                ] as [string, string | null][]
                            ).map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{k}</dt>
                                    <dd className="mt-0.5 break-all">{v || '—'}</dd>
                                </div>
                            ))}
                            {open.latitude != null && open.longitude != null && (
                                <a
                                    href={`https://www.google.com/maps?q=${open.latitude},${open.longitude}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-pink-600 hover:underline"
                                >
                                    <MapPin className="size-4" />
                                    {t('signins.openMap')}
                                </a>
                            )}
                            {open.clientInfo && (
                                <div>
                                    <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('signins.browserReported')}</dt>
                                    <dd className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                                        {Object.entries(open.clientInfo).map(([k, v]) => (
                                            <div key={k} className="contents">
                                                <span className="text-muted-foreground">{k}</span>
                                                <span className="break-all font-mono">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                                            </div>
                                        ))}
                                    </dd>
                                </div>
                            )}
                            {!open.clientInfo && !open.success && (
                                <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                    {t('signins.noClientInfo')}
                                </p>
                            )}
                        </dl>
                    </div>
                </div>
            )}
        </div>
    );
}
