'use client';

import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowRightLeft,
    ChevronDown,
    History,
    KeyRound,
    Laptop,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    RotateCcw,
    ShieldAlert,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DrawerClose } from '@/components/ui/drawer';
import { recordsApi, type TrailEntry } from '@/features/audit/audit-api';
import { DetailDrawer } from '@/features/audit/detail-drawer';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAuditTrail } from '@/stores/use-audit-trail';

const ACTION: Record<string, { key: TranslationKey; icon: LucideIcon; tone: string }> = {
    create: { key: 'activity.action.create', icon: Plus, tone: 'bg-emerald-500' },
    update: { key: 'activity.action.update', icon: Pencil, tone: 'bg-sky-500' },
    delete: { key: 'activity.action.delete', icon: Trash2, tone: 'bg-red-500' },
    restore: { key: 'trail.action.restore', icon: RotateCcw, tone: 'bg-violet-500' },
    status: { key: 'activity.action.status', icon: RefreshCw, tone: 'bg-amber-500' },
    stock: { key: 'activity.action.stock', icon: ArrowRightLeft, tone: 'bg-indigo-500' },
    password: { key: 'activity.action.password', icon: KeyRound, tone: 'bg-violet-500' },
};

function flag(code: string | null | undefined): string {
    if (!code || code.length !== 2) return '';
    return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

const show = (v: unknown) =>
    v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);

/** Global drawer: the full audit trail of one record. Mounted once. */
export function AuditTrailDrawer() {
    const { t } = useI18n();
    const { target, open, setOpen } = useAuditTrail();
    const { data, isLoading, isError } = useQuery({
        queryKey: ['record-trail', target?.entity, target?.id],
        queryFn: () => recordsApi.trail(target!.entity, target!.id),
        enabled: Boolean(open && target),
    });

    if (!target) return null;
    const s = data?.summary;
    const actor = (a: { name: string | null; username: string | null } | null | undefined) =>
        a?.name ? `${a.name}${a.username ? ` (@${a.username})` : ''}` : t('trail.beforeTracking');

    return (
        <DetailDrawer
            open={open}
            onOpenChange={setOpen}
            title={t('trail.title')}
            description={
                <span className="flex items-center gap-2">
                    <span className="truncate">{data?.label ?? target.label ?? target.id}</span>
                    {data && (
                        <span
                            className={cn(
                                'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                data.status === 'deleted'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
                            )}
                        >
                            {t(data.status === 'deleted' ? 'trail.status.deleted' : 'trail.status.active')}
                        </span>
                    )}
                </span>
            }
            footer={
                <DrawerClose asChild>
                    <Button variant="outline">{t('common.close')}</Button>
                </DrawerClose>
            }
        >
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
                    ))}
                </div>
            ) : isError || !data ? (
                <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    {t('trail.loadError')}
                </p>
            ) : (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-2">
                        <SummaryTile label={t('trail.createdBy')} who={actor(s?.created)} at={s?.created?.at} />
                        <SummaryTile
                            label={t('trail.modifiedBy')}
                            who={s?.lastModified ? actor(s.lastModified) : t('trail.neverModified')}
                            at={s?.lastModified?.at}
                        />
                        {s?.deleted && (
                            <SummaryTile label={t('trail.deletedBy')} who={actor(s.deleted)} at={s.deleted.at} danger />
                        )}
                        <SummaryTile label={t('trail.totalActions')} who={String(s?.totalActions ?? 0)} />
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-2 pt-1 text-sm font-semibold">
                        <History className="size-4 text-muted-foreground" />
                        {t('trail.history')}
                    </div>
                    {data.entries.length === 0 ? (
                        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                            {t('trail.empty')}
                        </p>
                    ) : (
                        <ol className="relative space-y-3 border-l-2 border-border/70 pl-5">
                            {[...data.entries].reverse().map((e) => (
                                <TrailItem key={e.id} entry={e} />
                            ))}
                        </ol>
                    )}
                </>
            )}
        </DetailDrawer>
    );
}

function SummaryTile({ label, who, at, danger }: { label: string; who: string; at?: string; danger?: boolean }) {
    return (
        <div className={cn('rounded-2xl border bg-card p-3', danger && 'border-red-200 bg-red-50/60 dark:border-red-500/20 dark:bg-red-500/5')}>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-1 truncate text-sm font-semibold">{who}</div>
            {at && (
                <div className="text-xs text-muted-foreground" title={format(new Date(at), 'PPpp')}>
                    {format(new Date(at), 'PP p')}
                </div>
            )}
        </div>
    );
}

function TrailItem({ entry: e }: { entry: TrailEntry }) {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const meta = ACTION[e.action] ?? ACTION.update;
    const fields = Array.from(
        new Set([...Object.keys(e.changes?.old_value ?? {}), ...Object.keys(e.changes?.new_value ?? {})]),
    );
    const isCreate = !e.changes?.old_value && !!e.changes?.new_value;
    const loc = e.location;
    const place = loc ? [loc.city, loc.country].filter(Boolean).join(', ') : null;
    const part = typeof e.details?.part === 'string' ? e.details.part : null;

    return (
        <li className="relative">
            <span className={cn('absolute -left-[31px] top-3 flex size-5 items-center justify-center rounded-full text-white ring-4 ring-background', e.status === 'success' ? meta.tone : 'bg-zinc-400')}>
                <meta.icon className="size-3" />
            </span>
            <div className="rounded-2xl border bg-card p-3.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold">
                        {t(meta.key)}
                        {part ? ` · ${part}` : ''}
                    </span>
                    {e.status !== 'success' && (
                        <span className="rounded-full bg-red-100 px-2 text-[11px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
                            {t(`activity.status.${e.status}` as TranslationKey)} {e.responseStatus ?? ''}
                        </span>
                    )}
                    {e.isSuspicious && (
                        <span title={e.suspiciousReason ?? ''} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                            <ShieldAlert className="size-3" />
                            {t('activity.suspicious')}
                        </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground" title={format(new Date(e.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                    </span>
                </div>

                <div className="mt-1 text-sm">
                    <span className="font-medium">{e.actorName}</span>
                    {e.actorUsername && <span className="font-mono text-xs text-muted-foreground"> @{e.actorUsername}</span>}
                    <span className="text-xs text-muted-foreground"> · {e.actorRole}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">{format(new Date(e.createdAt), 'PPpp')}</div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" />
                        {place ? `${flag(loc?.countryCode)} ${place}` : '—'}
                        {e.ip && <span className="font-mono">· {e.ip}</span>}
                        {loc?.isVpnOrProxy && (
                            <span className="rounded-full bg-red-100 px-1.5 text-[10px] font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">VPN</span>
                        )}
                    </span>
                    {e.device && (
                        <span className="inline-flex items-center gap-1">
                            <Laptop className="size-3.5" />
                            {[e.device.browser, e.device.os].filter(Boolean).join(' · ')}
                        </span>
                    )}
                </div>

                {fields.length > 0 && (
                    <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-pink-600 hover:underline">
                        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
                        {t('activity.changes.count').replace('{n}', String(fields.length))}
                    </button>
                )}
                {open && fields.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-xl border">
                        <table className="w-full text-xs">
                            <tbody className="divide-y">
                                {fields.map((f) => (
                                    <tr key={f}>
                                        <td className="w-28 bg-muted/40 px-2.5 py-1.5 font-mono text-muted-foreground">{f}</td>
                                        <td className="break-all px-2.5 py-1.5">
                                            {!isCreate && (
                                                <>
                                                    <span className="rounded bg-red-50 px-1 text-red-700 line-through dark:bg-red-500/10 dark:text-red-300">
                                                        {show(e.changes?.old_value?.[f])}
                                                    </span>
                                                    <span className="mx-1 text-muted-foreground">→</span>
                                                </>
                                            )}
                                            <span className="rounded bg-emerald-50 px-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                {show(e.changes?.new_value?.[f])}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </li>
    );
}
