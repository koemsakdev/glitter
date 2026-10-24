'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowDown,
    ArrowRightLeft,
    ArrowUp,
    ChevronRight,
    Download,
    History,
    KeyRound,
    Laptop,
    Pencil,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    ShieldAlert,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { recordsApi, type TrailEntry } from '@/features/audit/audit-api';
import {
    readableChanges,
    type ReadableChange,
    type ReadableValue,
} from '@/features/audit/readable-changes';
import { getFileUrl } from '@/lib/file-url';
import { SafeImg } from '@/components/ui/safe-image';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAuditTrail } from '@/stores/use-audit-trail';

const ACTION: Record<
    string,
    { key: TranslationKey; icon: LucideIcon; badge: string }
> = {
    create: {
        key: 'activity.action.create',
        icon: Plus,
        badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    },
    update: {
        key: 'activity.action.update',
        icon: Pencil,
        badge: 'bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300',
    },
    delete: {
        key: 'activity.action.delete',
        icon: Trash2,
        badge: 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300',
    },
    restore: {
        key: 'trail.action.restore',
        icon: RotateCcw,
        badge: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
    },
    status: {
        key: 'activity.action.status',
        icon: RefreshCw,
        badge: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300',
    },
    stock: {
        key: 'activity.action.stock',
        icon: ArrowRightLeft,
        badge: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-500/10 dark:text-indigo-300',
    },
    password: {
        key: 'activity.action.password',
        icon: KeyRound,
        badge: 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-500/10 dark:text-violet-300',
    },
};

function flag(code: string | null | undefined): string {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(
        ...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)),
    );
}

function initials(name: string | null | undefined): string {
    return (
        (name ?? '?')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0])
            .join('')
            .toUpperCase() || '?'
    );
}

/** Global modal: the full audit trail of one record. Mounted once. */
export function AuditTrailDialog() {
    const { t, language } = useI18n();
    const { target, open, setOpen } = useAuditTrail();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['record-trail', target?.entity, target?.id],
        queryFn: () => recordsApi.trail(target!.entity, target!.id),
        enabled: Boolean(open && target),
    });

    const [action, setAction] = useState('all');
    const [search, setSearch] = useState('');
    const [newestFirst, setNewestFirst] = useState(true);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    // Reset filters whenever another record is opened.
    const targetKey = `${target?.entity}:${target?.id}`;
    const [lastKey, setLastKey] = useState(targetKey);
    if (lastKey !== targetKey) {
        setLastKey(targetKey);
        setAction('all');
        setSearch('');
        setNewestFirst(true);
        setExpanded(new Set());
    }

    const entries = useMemo(() => data?.entries ?? [], [data]);
    const refs = useMemo(() => data?.refs ?? {}, [data]);
    const changesOf = (e: TrailEntry) => readableChanges(e, refs, language);
    const actionsPresent = useMemo(
        () => Array.from(new Set(entries.map((e) => e.action))),
        [entries],
    );
    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        const list = entries.filter((e) => {
            if (action !== 'all' && e.action !== action) return false;
            if (!q) return true;
            return [
                e.actorName,
                e.actorUsername,
                e.actorRole,
                e.ip,
                e.location?.city,
                e.location?.country,
                ...readableChanges(e, refs, language).flatMap((c) => [
                    c.label,
                    c.before?.text,
                    c.after.text,
                ]),
            ]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase().includes(q));
        });
        list.sort(
            (a, b) =>
                (+new Date(a.createdAt) - +new Date(b.createdAt)) *
                (newestFirst ? -1 : 1),
        );
        return list;
    }, [entries, action, search, newestFirst, refs, language]);

    function toggle(id: string) {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function exportCsv() {
        const esc = (v: unknown) => {
            const s = String(v ?? '');
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const head = [
            'Date',
            'Time',
            'Action',
            'Result',
            'User',
            'Username',
            'Role',
            'Changed fields',
            'Old values',
            'New values',
            'IP',
            'Location',
            'Device',
        ];
        const body = rows.map((e) => {
            const d = new Date(e.createdAt);
            const changes = changesOf(e);
            return [
                format(d, 'yyyy-MM-dd'),
                format(d, 'HH:mm:ss'),
                t((ACTION[e.action] ?? ACTION.update).key),
                e.status,
                e.actorName,
                e.actorUsername ?? '',
                e.actorRole,
                changes.map((c) => c.label).join('; '),
                changes
                    .filter((c) => c.before)
                    .map((c) => `${c.label}: ${c.before!.text}`)
                    .join('; '),
                changes.map((c) => `${c.label}: ${c.after.text}`).join('; '),
                e.ip ?? '',
                [e.location?.city, e.location?.country]
                    .filter(Boolean)
                    .join(', '),
                [e.device?.browser, e.device?.os].filter(Boolean).join(' · '),
            ];
        });
        const csv = [head, ...body]
            .map((r) => r.map(esc).join(','))
            .join('\r\n');
        const blob = new Blob(['﻿' + csv], {
            type: 'text/csv;charset=utf-8',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-trail_${target?.entity}_${(data?.label ?? target?.id ?? '').replace(/[^\w-]+/g, '-')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    if (!target) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="flex h-[min(88vh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
                {/* Header */}
                <div className="flex items-start gap-3 border-b px-6 py-5 pr-14">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-300">
                        <History className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <DialogTitle className="text-lg font-semibold">
                            {t('trail.title')}
                        </DialogTitle>
                        <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium text-foreground">
                                {data?.label ?? target.label ?? target.id}
                            </span>
                            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                                {target.entity}
                            </span>
                            {data && (
                                <span
                                    className={cn(
                                        'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                        data.status === 'deleted'
                                            ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                                    )}
                                >
                                    {t(
                                        data.status === 'deleted'
                                            ? 'trail.status.deleted'
                                            : 'trail.status.active',
                                    )}
                                </span>
                            )}
                        </DialogDescription>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3 p-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-12 animate-pulse rounded-lg bg-muted"
                            />
                        ))}
                    </div>
                ) : isError || !data ? (
                    <p className="m-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                        {t('trail.loadError')}
                    </p>
                ) : (
                    <>
                        {/* Toolbar */}
                        <div className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-1.5">
                                {['all', ...actionsPresent].map((a) => {
                                    const count =
                                        a === 'all'
                                            ? entries.length
                                            : entries.filter(
                                                  (e) => e.action === a,
                                              ).length;
                                    return (
                                        <button
                                            key={a}
                                            type="button"
                                            onClick={() => setAction(a)}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                                                action === a
                                                    ? 'border-pink-400 bg-pink-500 text-white dark:border-pink-700 dark:bg-pink-700'
                                                    : 'bg-card text-muted-foreground hover:text-foreground',
                                            )}
                                        >
                                            {a === 'all'
                                                ? t('trail.filter.all')
                                                : t(
                                                      (
                                                          ACTION[a] ??
                                                          ACTION.update
                                                      ).key,
                                                  )}
                                            <span className="tabular-nums opacity-70">
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="relative sm:w-64">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder={t('trail.search')}
                                    className="h-9 w-full rounded-full border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-pink-400"
                                />
                            </div>
                        </div>

                        {/* Table — the only scrolling area */}
                        <div className="mx-6 mb-4 min-h-0 flex-1 overflow-auto rounded-xl border [scrollbar-width:thin]">
                            {rows.length === 0 ? (
                                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <History className="size-6 opacity-40" />
                                    {entries.length === 0
                                        ? t('trail.empty')
                                        : t('trail.noMatch')}
                                </div>
                            ) : (
                                <table className="w-full min-w-215 text-sm">
                                    <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                                        <tr className="text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                            <th className="w-8 px-3 py-2.5" />
                                            <th className="px-3 py-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setNewestFirst(
                                                            (v) => !v,
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground"
                                                >
                                                    {t('trail.col.date')}
                                                    {newestFirst ? (
                                                        <ArrowDown className="size-3.5 text-pink-500" />
                                                    ) : (
                                                        <ArrowUp className="size-3.5 text-pink-500" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="px-3 py-2.5">
                                                {t('trail.col.action')}
                                            </th>
                                            <th className="px-3 py-2.5">
                                                {t('trail.col.user')}
                                            </th>
                                            <th className="px-3 py-2.5">
                                                {t('trail.col.changes')}
                                            </th>
                                            <th className="px-3 py-2.5">
                                                {t('trail.col.location')}
                                            </th>
                                            <th className="px-3 py-2.5">
                                                {t('trail.col.device')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {rows.map((e) => (
                                            <TrailRow
                                                key={e.id}
                                                entry={e}
                                                changes={changesOf(e)}
                                                open={expanded.has(e.id)}
                                                onToggle={() => toggle(e.id)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-6 py-3">
                    <span className="text-xs text-muted-foreground">
                        {data
                            ? t('trail.showing')
                                  .replace('{shown}', String(rows.length))
                                  .replace('{total}', String(entries.length))
                            : ''}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={!rows.length}
                            onClick={exportCsv}
                        >
                            <Download className="size-4" />
                            {t('trail.export')}
                        </Button>
                        <DialogClose
                            render={
                                <Button
                                    size="sm"
                                    className="rounded-full bg-pink-500 text-white hover:bg-pink-600 dark:bg-pink-700 dark:hover:bg-pink-800"
                                >
                                    {t('common.close')}
                                </Button>
                            }
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TrailRow({
    entry: e,
    changes,
    open,
    onToggle,
}: {
    entry: TrailEntry;
    changes: ReadableChange[];
    open: boolean;
    onToggle: () => void;
}) {
    const { t } = useI18n();
    const meta = ACTION[e.action] ?? ACTION.update;
    const isCreate = !e.changes?.old_value && !!e.changes?.new_value;
    const loc = e.location;
    const place = loc
        ? [loc.city, loc.country].filter(Boolean).join(', ')
        : null;
    const part = typeof e.details?.part === 'string' ? e.details.part : null;
    const d = new Date(e.createdAt);
    const canExpand = changes.length > 0;

    return (
        <Fragment>
            <tr
                onClick={canExpand ? onToggle : undefined}
                className={cn(
                    'align-middle transition-colors hover:bg-pink-50/40 dark:hover:bg-pink-500/5',
                    canExpand && 'cursor-pointer',
                    open && 'bg-muted/40',
                    e.synthetic && 'bg-muted/20',
                )}
            >
                <td className="px-3 py-3 text-muted-foreground">
                    {canExpand && (
                        <ChevronRight
                            className={cn(
                                'size-4 transition-transform',
                                open && 'rotate-90',
                            )}
                        />
                    )}
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                    <div className="font-medium tabular-nums">
                        {format(d, 'dd MMM yyyy')}
                    </div>
                    <div className="text-xs tabular-nums text-muted-foreground">
                        {format(d, 'HH:mm:ss')} ·{' '}
                        {formatDistanceToNow(d, { addSuffix: true })}
                    </div>
                </td>
                <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset',
                                meta.badge,
                            )}
                        >
                            <meta.icon className="size-3" />
                            {t(meta.key)}
                        </span>
                        {e.status !== 'success' && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                {t(
                                    `activity.status.${e.status}` as TranslationKey,
                                )}{' '}
                                {e.responseStatus ?? ''}
                            </span>
                        )}
                        {e.isSuspicious && (
                            <span
                                title={e.suspiciousReason ?? ''}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
                            >
                                <ShieldAlert className="size-3" />
                                {t('activity.suspicious')}
                            </span>
                        )}
                    </div>
                    {part && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                            {part}
                        </div>
                    )}
                </td>
                <td className="px-3 py-3">
                    {e.synthetic ? (
                        <div className="leading-tight">
                            <div className="text-sm font-medium italic text-muted-foreground">
                                {t('trail.notTracked')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {t('trail.fromRecordDates')}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-50 text-[11px] font-bold text-pink-700 dark:bg-pink-500/10 dark:text-pink-300">
                                {initials(e.actorName)}
                            </span>
                            <div className="min-w-0 leading-tight">
                                <div className="truncate font-medium">
                                    {e.actorName}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {e.actorUsername
                                        ? `@${e.actorUsername} · `
                                        : ''}
                                    <span className="capitalize">
                                        {e.actorRole}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </td>
                <td className="max-w-56 px-3 py-3">
                    {changes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                            {e.synthetic
                                ? t('trail.detailsUnknown')
                                : t('trail.noChanges')}
                        </span>
                    ) : (
                        <div className="flex flex-wrap gap-1">
                            {changes.slice(0, 3).map((c) => (
                                <span
                                    key={c.key}
                                    className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium"
                                >
                                    {c.label}
                                </span>
                            ))}
                            {changes.length > 3 && (
                                <span className="rounded-md px-1 py-0.5 text-[11px] font-medium text-pink-600">
                                    +{changes.length - 3}
                                </span>
                            )}
                        </div>
                    )}
                </td>
                <td className="px-3 py-3">
                    <div className="whitespace-nowrap text-sm">
                        {place ? `${flag(loc?.countryCode)} ${place}` : '—'}
                        {loc?.isVpnOrProxy && (
                            <span className="ml-1.5 rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                                VPN
                            </span>
                        )}
                    </div>
                    {e.ip && (
                        <div className="font-mono text-xs text-muted-foreground">
                            {e.ip}
                        </div>
                    )}
                </td>
                <td className="px-3 py-3">
                    {e.device ? (
                        <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground">
                            <Laptop className="size-3.5 shrink-0" />
                            {[e.device.browser, e.device.os]
                                .filter(Boolean)
                                .join(' · ') || '—'}
                        </div>
                    ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                    )}
                </td>
            </tr>
            {open && canExpand && (
                <tr className="bg-muted/30">
                    <td />
                    <td colSpan={6} className="px-3 pb-4 pt-1">
                        <div className="overflow-hidden rounded-lg border bg-card">
                            <table className="w-full text-xs">
                                <thead className="bg-muted/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <tr>
                                        <th className="w-48 px-3 py-2 font-medium">
                                            {t('activity.changes.field')}
                                        </th>
                                        {!isCreate && (
                                            <th className="px-3 py-2 font-medium">
                                                {t('activity.changes.old')}
                                            </th>
                                        )}
                                        <th className="px-3 py-2 font-medium">
                                            {t('activity.changes.new')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {changes.map((c) => (
                                        <tr key={c.key} className="align-top">
                                            <td className="px-3 py-2 font-medium text-muted-foreground">
                                                {c.label}
                                            </td>
                                            {!isCreate && (
                                                <td className="px-3 py-2">
                                                    <ValueCell
                                                        value={c.before}
                                                        tone="old"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-3 py-2">
                                                <ValueCell
                                                    value={c.after}
                                                    tone={
                                                        isCreate
                                                            ? 'plain'
                                                            : 'new'
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

/** One value in the changes table: text, a photo preview, or a color swatch. */
function ValueCell({
    value,
    tone,
}: {
    value: ReadableValue | null;
    tone: 'old' | 'new' | 'plain';
}) {
    if (!value) return null;
    const src = value.image ? getFileUrl(value.image) : null;
    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-2 break-words rounded px-1.5 py-0.5',
                tone === 'old' &&
                    'bg-red-50 text-red-700 line-through decoration-red-400/60 dark:bg-red-500/10 dark:text-red-300',
                tone === 'new' &&
                    'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
                tone === 'plain' && 'font-medium text-foreground',
            )}
        >
            {src && (
                <span className="size-9 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <SafeImg
                        src={src}
                        alt=""
                        className="size-full object-cover"
                    />
                </span>
            )}
            {value.swatch && (
                <span
                    className="size-3.5 shrink-0 rounded-full border"
                    style={{ background: value.swatch }}
                />
            )}
            {!src && <span className="min-w-0">{value.text}</span>}
        </span>
    );
}
