'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import {
    Bot,
    Check,
    CheckCircle2,
    Copy,
    Filter,
    KeyRound,
    Network,
    UserRound,
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
import { Button } from '@/components/ui/button';
import { DrawerClose } from '@/components/ui/drawer';
import {
    DetailDrawer,
    DetailHero,
    DetailRow,
    DetailSection,
    SectionButton,
} from '@/features/audit/detail-drawer';
import { Combobox } from '@/components/ui/combobox';
import { loginApi, type LoginAttempt } from '@/features/audit/audit-api';
import { useTableSort } from '@/hooks/use-table-sort';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const REASONS: Record<string, TranslationKey> = {
    unknown_user: 'signins.reason.unknown_user',
    ip_blocked: 'signins.reason.ip_blocked',
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
    const [result, setResult] = useState<'' | 'success' | 'failed' | 'blocked'>(
        '',
    );
    const [ip, setIp] = useState('');
    const tableSort = useTableSort('createdAt', true, () => setPage(1));
    // Keep the last entry while the sheet animates closed.
    const [open, setOpen] = useState<LoginAttempt | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: [
            'login-attempts',
            page,
            pageSize,
            search,
            result,
            ip,
            tableSort.sort,
        ],
        queryFn: () =>
            loginApi.list({
                sortBy: tableSort.sortBy,
                sortOrder: tableSort.sortOrder,
                page,
                limit: pageSize,
                search: search || undefined,
                status: result || undefined,
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
                meta: { sortKey: 'createdAt' },
                header: t('activity.col.when'),
                cell: ({ row }) => {
                    const d = new Date(row.original.createdAt);
                    return (
                        <div className="whitespace-nowrap">
                            <div className="text-sm">
                                {formatDistanceToNow(d, { addSuffix: true })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {format(d, 'PP p')}
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'success',
                meta: { sortKey: 'status' },
                header: t('signins.col.result'),
                cell: ({ row }) => {
                    const l = row.original;
                    if (l.status === 'blocked') {
                        return (
                            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-600 px-2.5 py-1 text-xs font-medium text-white">
                                <ShieldAlert className="size-3.5" />
                                {t('signins.blocked')}
                            </span>
                        );
                    }
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
                                    {REASONS[l.failureReason]
                                        ? t(REASONS[l.failureReason])
                                        : l.failureReason}
                                </div>
                            )}
                            {l.failedAttemptCount > 1 && (
                                <div
                                    className={cn(
                                        'text-xs font-semibold',
                                        l.failedAttemptCount >= 5
                                            ? 'text-red-600'
                                            : 'text-amber-600',
                                    )}
                                >
                                    {t('signins.attemptNo').replace(
                                        '{n}',
                                        String(l.failedAttemptCount),
                                    )}
                                </div>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'usernameTried',
                meta: { sortKey: 'usernameTried' },
                header: t('signins.col.account'),
                cell: ({ row }) => {
                    const l = row.original;
                    return (
                        <div className="min-w-0 max-w-44">
                            <div className="truncate text-sm font-medium">
                                {l.userName ?? '—'}
                            </div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                                {l.usernameTried}
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'ip',
                meta: { sortKey: 'ip' },
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
                meta: { sortKey: 'country' },
                header: t('signins.col.location'),
                cell: ({ row }) => {
                    const l = row.original;
                    if (!l.country) {
                        return (
                            <span className="text-xs text-muted-foreground">
                                {t('signins.locating')}
                            </span>
                        );
                    }
                    return (
                        <div className="min-w-0 max-w-52">
                            <div className="truncate text-sm">
                                <span className="mr-1">
                                    {flag(l.countryCode)}
                                </span>
                                {place(l)}
                            </div>
                            {l.isp && (
                                <div className="truncate text-xs text-muted-foreground">
                                    {l.isp}
                                </div>
                            )}
                            {(l.isVpnOrProxy || l.isHosting) && (
                                <span className="mt-0.5 inline-block rounded-full bg-red-100 px-2 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                    {l.isVpnOrProxy
                                        ? t('signins.vpn')
                                        : t('signins.hosting')}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: 'browser',
                meta: { sortKey: 'browser' },
                header: t('signins.col.device'),
                cell: ({ row }) => {
                    const l = row.original;
                    const Icon = DEVICE_ICON[l.deviceType ?? ''] ?? Laptop;
                    return (
                        <div
                            className={cn(
                                'flex items-center gap-2',
                                l.deviceType === 'bot' &&
                                    'text-red-600 dark:text-red-400',
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <div className="min-w-0">
                                <div className="truncate text-sm">
                                    {l.browser ?? t('signins.unknownBrowser')}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {l.os ?? '—'}
                                </div>
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
                        onClick={() => {
                            setOpen(row.original);
                            setSheetOpen(true);
                        }}
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
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {t('signins.last24h')}
                        </div>
                        <div className="mt-2 flex items-end gap-4">
                            <div>
                                <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                                    {summary.last24h.successful}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {t('signins.success')}
                                </div>
                            </div>
                            <div>
                                <div
                                    className={cn(
                                        'text-2xl font-bold tabular-nums',
                                        summary.last24h.failed > 0
                                            ? 'text-red-600'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {summary.last24h.failed}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {t('signins.failed')} ·{' '}
                                    {t('signins.fromIps').replace(
                                        '{n}',
                                        String(summary.last24h.failedIps),
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border bg-card p-4 md:col-span-2">
                        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <ShieldAlert className="size-3.5 text-red-500" />
                            {t('signins.suspicious')}
                        </div>
                        {summary.topFailingIps.length === 0 &&
                        summary.newCountrySignIns.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                                {t('signins.allClear')}
                            </p>
                        ) : (
                            <ul className="mt-2 space-y-1.5 text-sm">
                                {summary.topFailingIps.map((r) => (
                                    <li
                                        key={r.ip}
                                        className="flex flex-wrap items-center gap-x-2"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIp(r.ip);
                                                setPage(1);
                                            }}
                                            className="font-mono font-medium hover:text-pink-600 hover:underline"
                                        >
                                            {r.ip}
                                        </button>
                                        <span
                                            className={cn(
                                                'rounded-full px-2 text-xs font-semibold',
                                                r.attempts >= 5
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
                                            )}
                                        >
                                            {t('signins.failedTimes').replace(
                                                '{n}',
                                                String(r.attempts),
                                            )}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {[r.city, r.country]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {t('signins.tried')}: {r.usernames}
                                        </span>
                                    </li>
                                ))}
                                {summary.newCountrySignIns.map((r) => (
                                    <li
                                        key={`${r.userName}-${r.at}`}
                                        className="flex items-center gap-2 text-amber-700 dark:text-amber-300"
                                    >
                                        <Globe2 className="size-4" />
                                        {t('signins.newCountry')
                                            .replace('{name}', r.userName)
                                            .replace(
                                                '{place}',
                                                [r.city, r.country]
                                                    .filter(Boolean)
                                                    .join(', '),
                                            )}
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
                                    {
                                        value: '',
                                        label: t('signins.allResults'),
                                    },
                                    {
                                        value: 'failed',
                                        label: t('signins.failed'),
                                    },
                                    {
                                        value: 'blocked',
                                        label: t('signins.blocked'),
                                    },
                                    {
                                        value: 'success',
                                        label: t('signins.success'),
                                    },
                                ]}
                                value={result}
                                onChange={(v) => {
                                    setResult(
                                        v as
                                            | ''
                                            | 'success'
                                            | 'failed'
                                            | 'blocked',
                                    );
                                    setPage(1);
                                }}
                                placeholder={t('signins.allResults')}
                            />
                        </div>
                        {ip && (
                            <button
                                type="button"
                                onClick={() => setIp('')}
                                className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 font-mono text-xs text-pink-700 dark:bg-pink-500/15 dark:text-pink-300"
                            >
                                IP {ip}
                                <X className="size-3" />
                            </button>
                        )}
                    </div>
                }
                sort={tableSort.sort}
                onSortChange={tableSort.onSortChange}
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

            <SignInDrawer
                attempt={open}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                onFilterIp={(value) => {
                    setIp(value);
                    setPage(1);
                    setSheetOpen(false);
                }}
            />
        </div>
    );
}

/** Everything about one sign-in attempt, in a shadcn bottom drawer. */
function SignInDrawer({
    attempt: a,
    open,
    onOpenChange,
    onFilterIp,
}: {
    attempt: LoginAttempt | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onFilterIp: (ip: string) => void;
}) {
    const { t } = useI18n();
    const [copied, setCopied] = useState(false);
    if (!a) return null;

    const reason = a.failureReason
        ? REASONS[a.failureReason]
            ? t(REASONS[a.failureReason])
            : a.failureReason
        : null;
    const hero =
        a.status === 'blocked'
            ? {
                  icon: ShieldAlert,
                  tone: 'danger' as const,
                  title: t('signins.blocked'),
              }
            : a.success
              ? {
                    icon: CheckCircle2,
                    tone: 'success' as const,
                    title: t('signins.success'),
                }
              : {
                    icon: XCircle,
                    tone: 'danger' as const,
                    title: t('signins.failed'),
                };
    const DeviceIcon = DEVICE_ICON[a.deviceType ?? ''] ?? Laptop;
    const network = a.isVpnOrProxy
        ? t('signins.vpn')
        : a.isHosting
          ? t('signins.hosting')
          : a.isVpnOrProxy === false
            ? t('signins.normalNetwork')
            : null;
    const mapUrl =
        a.latitude != null && a.longitude != null
            ? `https://www.google.com/maps?q=${a.latitude},${a.longitude}`
            : null;

    return (
        <DetailDrawer
            open={open}
            onOpenChange={onOpenChange}
            title={t('signins.details')}
            description={`${a.userName ?? a.usernameTried} · ${format(new Date(a.createdAt), 'PPpp')}`}
            footer={
                <>
                    <Button
                        onClick={() => onFilterIp(a.ip)}
                        className="bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                    >
                        <Filter className="mr-2 size-4" />
                        {t('signins.filterByIp')}
                    </Button>
                    <DrawerClose
                        render={
                            <Button variant="outline">
                                {t('common.close')}
                            </Button>
                        }
                    />
                </>
            }
        >
            <DetailHero
                icon={hero.icon}
                tone={hero.tone}
                title={hero.title}
                subtitle={
                    [
                        reason,
                        a.failedAttemptCount > 1
                            ? t('signins.attemptNo').replace(
                                  '{n}',
                                  String(a.failedAttemptCount),
                              )
                            : null,
                    ]
                        .filter(Boolean)
                        .join(' · ') ||
                    formatDistanceToNow(new Date(a.createdAt), {
                        addSuffix: true,
                    })
                }
                aside={
                    (a.isVpnOrProxy || a.isHosting) && (
                        <span className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                            {network}
                        </span>
                    )
                }
            />

            <div className="space-y-3">
                <DetailSection
                    icon={UserRound}
                    title={t('signins.col.account')}
                >
                    <DetailRow
                        label={t('signins.name')}
                        value={a.userName ?? t('signins.noAccount')}
                    />
                    <DetailRow
                        label={t('signins.typed')}
                        value={a.usernameTried}
                        mono
                    />
                    <DetailRow label={t('signins.role')} value={a.userRole} />
                </DetailSection>

                <DetailSection
                    icon={Globe2}
                    title={t('signins.col.location')}
                    action={
                        mapUrl && (
                            <SectionButton
                                href={mapUrl}
                                icon={MapPin}
                                label={t('signins.map')}
                            />
                        )
                    }
                >
                    <DetailRow
                        label={t('signins.place')}
                        value={
                            a.country
                                ? `${flag(a.countryCode)} ${place(a)}`
                                : t('signins.locating')
                        }
                    />
                    <DetailRow
                        label={t('signins.ipTimezone')}
                        value={a.ipTimezone}
                    />
                    <DetailRow
                        label={t('signins.coordinates')}
                        value={
                            a.latitude != null
                                ? `${a.latitude.toFixed(3)}, ${a.longitude?.toFixed(3)}`
                                : null
                        }
                        mono
                    />
                </DetailSection>

                <DetailSection
                    icon={Network}
                    title={t('signins.networkTitle')}
                    action={
                        <SectionButton
                            onClick={() => {
                                void navigator.clipboard.writeText(a.ip);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }}
                            icon={copied ? Check : Copy}
                            label={
                                copied
                                    ? t('signins.copied')
                                    : t('signins.copyIp')
                            }
                        />
                    }
                >
                    <DetailRow label={t('signins.col.ip')} value={a.ip} mono />
                    <DetailRow label={t('signins.isp')} value={a.isp} />
                    <DetailRow label={t('signins.network')} value={network} />
                    <DetailRow
                        label={t('signins.forwardedFor')}
                        value={a.forwardedFor}
                        mono
                    />
                </DetailSection>

                <DetailSection
                    icon={DeviceIcon}
                    title={t('signins.col.device')}
                >
                    <DetailRow label={t('signins.browser')} value={a.browser} />
                    <DetailRow label={t('signins.os')} value={a.os} />
                    <DetailRow
                        label={t('signins.deviceType')}
                        value={a.deviceType}
                    />
                    <DetailRow
                        label={t('signins.screen')}
                        value={(a.clientInfo?.screen as string) ?? null}
                    />
                    <DetailRow
                        label={t('signins.deviceTimezone')}
                        value={(a.clientInfo?.timezone as string) ?? null}
                    />
                    <DetailRow
                        label={t('signins.language')}
                        value={(a.clientInfo?.language as string) ?? null}
                    />
                </DetailSection>
            </div>

            {a.success && (
                <DetailSection icon={KeyRound} title={t('signins.session')}>
                    <DetailRow
                        label={t('signins.sessionId')}
                        value={a.sessionId}
                        mono
                    />
                    <DetailRow
                        label={t('signins.signedOut')}
                        value={
                            a.logoutAt
                                ? format(new Date(a.logoutAt), 'PPpp')
                                : t('signins.stillSignedIn')
                        }
                    />
                </DetailSection>
            )}

            {!a.clientInfo && !a.success && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    {t('signins.noClientInfo')}
                </p>
            )}

            <details className="rounded-2xl border bg-card px-4 py-2.5 text-sm">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('signins.userAgent')}
                </summary>
                <p className="mt-2 break-all font-mono text-xs">
                    {a.userAgent ?? '—'}
                </p>
            </details>
        </DetailDrawer>
    );
}
