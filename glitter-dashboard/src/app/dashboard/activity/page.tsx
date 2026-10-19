'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format, formatDistanceToNow } from 'date-fns';
import {
    ArrowRightLeft,
    KeyRound,
    LogIn,
    LogOut,
    ShieldAlert,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
    type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SignInsTab } from '@/features/audit/sign-ins-tab';
import { ResourceList } from '@/components/resource/resource-list';
import { Combobox } from '@/components/ui/combobox';
import type { AuditAction, AuditLog } from '@/features/audit/audit-api';
import { useAuditLogs } from '@/features/audit/use-audit';
import { UserRoleBadge } from '@/features/users/components/user-badges';
import { useUsers } from '@/features/users/use-users';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

const ACTIONS: Record<
    AuditAction,
    { key: TranslationKey; icon: LucideIcon; tone: string }
> = {
    create: {
        key: 'activity.action.create',
        icon: Plus,
        tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    },
    update: {
        key: 'activity.action.update',
        icon: Pencil,
        tone: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    },
    delete: {
        key: 'activity.action.delete',
        icon: Trash2,
        tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    },
    status: {
        key: 'activity.action.status',
        icon: RefreshCw,
        tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    },
    stock: {
        key: 'activity.action.stock',
        icon: ArrowRightLeft,
        tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    },
    login: {
        key: 'activity.action.login',
        icon: LogIn,
        tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
    },
    logout: {
        key: 'activity.action.logout',
        icon: LogOut,
        tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
    },
    login_failed: {
        key: 'activity.action.loginFailed',
        icon: ShieldAlert,
        tone: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
    },
    password: {
        key: 'activity.action.password',
        icon: KeyRound,
        tone: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    },
    other: {
        key: 'activity.action.other',
        icon: Pencil,
        tone: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
    },
};

/** Record types worth filtering by (API entity → label). */
const ENTITIES: Record<string, TranslationKey> = {
    products: 'activity.entity.products',
    orders: 'activity.entity.orders',
    inventory: 'activity.entity.inventory',
    categories: 'activity.entity.categories',
    brands: 'activity.entity.brands',
    colors: 'activity.entity.colors',
    badges: 'activity.entity.badges',
    vouchers: 'activity.entity.vouchers',
    users: 'activity.entity.users',
    branches: 'activity.entity.branches',
    reviews: 'activity.entity.reviews',
    'app-settings': 'activity.entity.settings',
    banners: 'activity.entity.banners',
    advertisements: 'activity.entity.ads',
    shipments: 'activity.entity.shipments',
    menu: 'activity.entity.menu',
    pages: 'activity.entity.pages',
    'payment-config': 'activity.entity.payments',
    auth: 'activity.entity.auth',
};

/** Where a record can be opened (not for deletes — it's gone). */
function recordHref(log: AuditLog): string | null {
    if (!log.entityId || log.action === 'delete') return null;
    const base: Record<string, string> = {
        products: '/dashboard/products',
        orders: '/dashboard/orders',
        categories: '/dashboard/categories',
        brands: '/dashboard/brands',
        users: '/dashboard/staff',
        branches: '/dashboard/branches',
    };
    return base[log.entity] ? `${base[log.entity]}/${log.entityId}` : null;
}

function describeDetails(
    log: AuditLog,
    t: (k: TranslationKey) => string,
): string | null {
    const d = log.details;
    if (!d) return null;
    if (typeof d.part === 'string') {
        return `${t('activity.detail.part')}: ${d.part}`;
    }
    if (Array.isArray(d.fields) && d.fields.length) {
        return `${t('activity.detail.fields')}: ${(d.fields as string[]).join(', ')}`;
    }
    if (d.status) return `→ ${String(d.status)}`;
    if (log.action === 'stock') {
        const qty = d.quantityAvailable ?? d.quantity;
        return qty !== undefined
            ? `${t('activity.detail.qty')}: ${String(qty)}`
            : String(d.operation ?? '');
    }
    return null;
}

function ActionsTab() {
    const { t } = useI18n();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [search, setSearch] = useState('');
    const [action, setAction] = useState('');
    const [entity, setEntity] = useState('');
    const [actorId, setActorId] = useState('');

    const { data, isLoading, isFetching } = useAuditLogs({
        page,
        limit: pageSize,
        search: search || undefined,
        action: action || undefined,
        entity: entity || undefined,
        actorId: actorId || undefined,
    });
    const { data: staff } = useUsers({ page: 1, limit: 100, staffOnly: true });

    const reset = () => setPage(1);
    const actionOptions = useMemo(
        () => [
            { value: '', label: t('activity.filter.allActions') },
            ...(Object.keys(ACTIONS) as AuditAction[])
                .filter((a) => a !== 'other')
                .map((a) => ({ value: a, label: t(ACTIONS[a].key) })),
        ],
        [t],
    );
    const entityOptions = useMemo(
        () => [
            { value: '', label: t('activity.filter.allRecords') },
            ...Object.entries(ENTITIES).map(([value, key]) => ({
                value,
                label: t(key),
            })),
        ],
        [t],
    );
    const staffOptions = useMemo(
        () => [
            { value: '', label: t('activity.filter.allStaff') },
            ...(staff?.data ?? []).map((u) => ({
                value: u.id,
                label: u.fullName,
                secondary: u.username ? `@${u.username}` : undefined,
            })),
        ],
        [staff, t],
    );

    const columns = useMemo<ColumnDef<AuditLog, unknown>[]>(
        () => [
            {
                accessorKey: 'createdAt',
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
                accessorKey: 'actorName',
                header: t('activity.col.who'),
                cell: ({ row }) => {
                    const l = row.original;
                    return (
                        <div className="flex min-w-0 items-center gap-2">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">
                                    {l.actorName}
                                </div>
                                {l.actorUsername && (
                                    <div className="font-mono text-xs text-muted-foreground">
                                        @{l.actorUsername}
                                    </div>
                                )}
                            </div>
                            <UserRoleBadge role={l.actorRole as UserRole} />
                        </div>
                    );
                },
            },
            {
                accessorKey: 'action',
                header: t('activity.col.action'),
                cell: ({ row }) => {
                    const a = ACTIONS[row.original.action] ?? ACTIONS.other;
                    return (
                        <span
                            className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                                a.tone,
                            )}
                        >
                            <a.icon className="size-3.5" />
                            {t(a.key)}
                        </span>
                    );
                },
            },
            {
                accessorKey: 'label',
                header: t('activity.col.what'),
                cell: ({ row }) => {
                    const l = row.original;
                    const kind = ENTITIES[l.entity]
                        ? t(ENTITIES[l.entity])
                        : l.entity;
                    const href = recordHref(l);
                    const name = l.label ?? l.entityId?.slice(0, 8) ?? '';
                    const details = describeDetails(l, t);
                    return (
                        <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">
                                {kind}
                            </div>
                            {name &&
                                (href ? (
                                    <Link
                                        href={href}
                                        className="block truncate text-sm font-medium hover:text-pink-600 hover:underline"
                                    >
                                        {name}
                                    </Link>
                                ) : (
                                    <div
                                        className={cn(
                                            'truncate text-sm font-medium',
                                            l.action === 'delete' &&
                                                'line-through decoration-red-400/70',
                                        )}
                                    >
                                        {name}
                                    </div>
                                ))}
                            {details && (
                                <div className="truncate text-xs text-muted-foreground">
                                    {details}
                                </div>
                            )}
                        </div>
                    );
                },
            },
        ],
        [t],
    );

    return (
        <ResourceList
            title={t('activity.title')}
            subtitle={t('activity.subtitle')}
            search={search}
            onSearchChange={(v) => {
                setSearch(v);
                reset();
            }}
            searchPlaceholder={t('activity.search')}
            filters={
                <div className="flex flex-wrap gap-2">
                    <div className="w-48">
                        <Combobox
                            options={staffOptions}
                            value={actorId}
                            onChange={(v) => {
                                setActorId(v);
                                reset();
                            }}
                            placeholder={t('activity.filter.allStaff')}
                        />
                    </div>
                    <div className="w-40">
                        <Combobox
                            options={actionOptions}
                            value={action}
                            onChange={(v) => {
                                setAction(v);
                                reset();
                            }}
                            placeholder={t('activity.filter.allActions')}
                        />
                    </div>
                    <div className="w-40">
                        <Combobox
                            options={entityOptions}
                            value={entity}
                            onChange={(v) => {
                                setEntity(v);
                                reset();
                            }}
                            placeholder={t('activity.filter.allRecords')}
                        />
                    </div>
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
            onPageSizeChange={(size) => {
                setPageSize(size);
                reset();
            }}
            emptyTitle={t('activity.empty')}
            emptyDescription={t('activity.emptyHelp')}
            emptyFilteredTitle={t('activity.noMatch')}
            hasActiveFilters={Boolean(search || action || entity || actorId)}
        />
    );
}

/** Activity Log: staff actions, and dashboard sign-in attempts (security). */
export default function ActivityPage() {
    const { t } = useI18n();
    const [tab, setTab] = useState<'actions' | 'signins'>('actions');
    return (
        <div className="space-y-5">
            <div className="inline-flex rounded-full border bg-card p-1">
                {(
                    [
                        ['actions', 'activity.tab.actions'],
                        ['signins', 'activity.tab.signins'],
                    ] as const
                ).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={cn(
                            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                            tab === key
                                ? 'bg-pink-400 text-white dark:bg-pink-700'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {t(label)}
                    </button>
                ))}
            </div>
            {tab === 'actions' ? <ActionsTab /> : <SignInsTab />}
        </div>
    );
}
