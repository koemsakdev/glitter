'use client';

import {
    CalendarClock,
    Loader,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Ticket,
    Trash2,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { VoucherFormDialog } from '@/features/vouchers/voucher-form-dialog';
import {
    useCreateVoucher,
    useDeleteVoucher,
    useUpdateVoucher,
    useVouchers,
} from '@/features/vouchers/use-vouchers';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Voucher, VoucherFormValues } from '@/types/voucher';

/** Local 'YYYY-MM-DD' (not UTC) so it matches the picked dates. */
function today(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0',
    )}-${String(d.getDate()).padStart(2, '0')}`;
}

type PromoStatus = 'active' | 'scheduled' | 'expired' | 'off';

function statusOf(v: Voucher, now: string): PromoStatus {
    if (!v.active) return 'off';
    if (v.startAt && v.startAt > now) return 'scheduled';
    const usedUp = v.usageLimit != null && v.usedCount >= v.usageLimit;
    if ((v.endAt && v.endAt < now) || usedUp) return 'expired';
    return 'active';
}

export default function PromotionsPage() {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const { data: vouchers = [], isLoading } = useVouchers();
    const create = useCreateVoucher();
    const update = useUpdateVoucher();
    const remove = useDeleteVoucher();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<Voucher | null>(null);
    const [formKey, setFormKey] = useState(0);
    const [deleting, setDeleting] = useState<Voucher | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | PromoStatus>(
        'all',
    );

    const filtered = useMemo(() => {
        const now = today();
        const q = search.trim().toLowerCase();
        return vouchers.filter((v) => {
            if (statusFilter !== 'all' && statusOf(v, now) !== statusFilter)
                return false;
            if (!q) return true;
            return (
                v.nameEn.toLowerCase().includes(q) ||
                v.nameKm.toLowerCase().includes(q) ||
                (v.code ?? '').toLowerCase().includes(q)
            );
        });
    }, [vouchers, search, statusFilter]);

    const pending = create.isPending || update.isPending;
    const vName = (v: Voucher) =>
        (language === 'km' ? v.nameKm : v.nameEn) || v.nameEn;

    function openForm(item: Voucher | null) {
        setEditing(item);
        setFormKey((k) => k + 1);
        setFormOpen(true);
    }

    function onError(error: unknown) {
        toast({
            title: t('common.toast.error'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function handleSubmit(values: VoucherFormValues) {
        if (editing) {
            update.mutate(
                { id: editing.id, values },
                {
                    onSuccess: () => {
                        setFormOpen(false);
                        setEditing(null);
                    },
                    onError,
                },
            );
        } else {
            create.mutate(values, {
                onSuccess: () => setFormOpen(false),
                onError,
            });
        }
    }

    function toggleActive(v: Voucher) {
        update.mutate({ id: v.id, values: { active: !v.active } }, { onError });
    }

    function discountText(v: Voucher) {
        const amount =
            v.discountType === 'percent'
                ? `${v.discountValue}%`
                : `$${v.discountValue}`;
        if (v.appliesTo === 'delivery') {
            // Percent covering the whole fee reads best as "Free delivery".
            if (v.discountType === 'percent' && v.discountValue >= 100)
                return t('voucher.freeDelivery');
            return `${amount} ${t('voucher.offDelivery')}`;
        }
        return `${amount} ${t('voucher.off')}`;
    }

    if (isLoading) return <LoadingScreen variant="page" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                            {t('voucher.title')}
                        </h1>
                        {(pending || remove.isPending) && (
                            <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader className="size-4 animate-spin" />
                                <span className="mt-0.5">
                                    {t('common.saving')}
                                </span>
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {t('voucher.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={() => openForm(null)}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Plus className="size-4" />
                    {t('voucher.add')}
                </Button>
            </div>

            {vouchers.length === 0 ? (
                <div className="rounded-xl border border-dashed py-16 text-center">
                    <Ticket className="mx-auto size-8 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('voucher.empty')}
                    </p>
                </div>
            ) : (
                <>
                    {/* Search + status filter */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('voucher.search')}
                                className="h-10 w-full rounded-lg border bg-background pl-9 pr-9 text-sm outline-none transition-colors focus:border-pink-500 [&::-webkit-search-cancel-button]:appearance-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    aria-label={t('common.clear')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {(
                                [
                                    'all',
                                    'active',
                                    'scheduled',
                                    'expired',
                                    'off',
                                ] as const
                            ).map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setStatusFilter(s)}
                                    className={cn(
                                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                                        statusFilter === s
                                            ? 'border-pink-500 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300'
                                            : 'text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    {t(`voucher.filter.${s}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="rounded-xl border border-dashed py-16 text-center">
                            <Search className="mx-auto size-8 text-muted-foreground/50" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t('voucher.noResults')}
                            </p>
                        </div>
                    ) : (
                        <div className="stagger grid grid-cols-1 gap-3 lg:grid-cols-2">
                            {filtered.map((v) => {
                        const expired = !!v.endAt && v.endAt < today();
                        const scheduled = !!v.startAt && v.startAt > today();
                        const usedUp =
                            v.usageLimit != null &&
                            v.usedCount >= v.usageLimit;
                        return (
                            <div
                                key={v.id}
                                className={cn(
                                    'flex flex-col gap-3 rounded-xl border bg-card p-4 transition-opacity sm:flex-row sm:items-center',
                                    (!v.active || expired || usedUp) &&
                                        'opacity-60',
                                )}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold">
                                            {vName(v)}
                                        </span>
                                        {v.code ? (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-semibold uppercase">
                                                <Ticket className="size-3" />
                                                {v.code}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                                                <Sparkles className="size-3" />
                                                {t('voucher.automatic')}
                                            </span>
                                        )}
                                        {expired && (
                                            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                                {t('voucher.expired')}
                                            </span>
                                        )}
                                        {scheduled && !expired && (
                                            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                                {t('voucher.scheduled')}
                                            </span>
                                        )}
                                        {(v.firstOrderOnly ||
                                            v.newAccountDays != null) && (
                                            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
                                                {t('voucher.newCustomers')}
                                            </span>
                                        )}
                                    </div>

                                    <p className="mt-1 text-sm">
                                        <span className="font-bold text-pink-600 dark:text-pink-400">
                                            {discountText(v)}
                                        </span>
                                        {v.minSpend > 0 && (
                                            <span className="text-muted-foreground">
                                                {' · '}
                                                {t('voucher.minSpendShort')} $
                                                {v.minSpend}
                                            </span>
                                        )}
                                        {v.discountType === 'percent' &&
                                            !!v.maxDiscount &&
                                            v.maxDiscount > 0 && (
                                                <span className="text-muted-foreground">
                                                    {' · '}
                                                    {t('voucher.capShort')} $
                                                    {v.maxDiscount}
                                                </span>
                                            )}
                                    </p>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {(v.startAt || v.endAt) && (
                                            <span className="flex items-center gap-1">
                                                <CalendarClock className="size-3" />
                                                {v.startAt ?? '…'} →{' '}
                                                {v.endAt ?? '…'}
                                            </span>
                                        )}
                                        <span>
                                            {t('voucher.used')}: {v.usedCount}
                                            {v.usageLimit != null
                                                ? ` / ${v.usageLimit}`
                                                : ''}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 self-end sm:self-center">
                                    <Switch
                                        size="lg"
                                        checked={v.active}
                                        onCheckedChange={() => toggleActive(v)}
                                        title={
                                            v.active
                                                ? t('voucher.deactivate')
                                                : t('voucher.activate')
                                        }
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:bg-blue-50 hover:text-blue-600"
                                        title={t('common.edit')}
                                        onClick={() => openForm(v)}
                                    >
                                        <Pencil className="size-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                        title={t('common.delete')}
                                        onClick={() => setDeleting(v)}
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                            })}
                        </div>
                    )}
                </>
            )}

            <VoucherFormDialog
                key={formKey}
                open={formOpen}
                item={editing}
                pending={pending}
                onOpenChange={(o) => {
                    setFormOpen(o);
                    if (!o) setEditing(null);
                }}
                onSubmit={handleSubmit}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => {
                    if (!o) setDeleting(null);
                }}
                title={t('voucher.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting ? vName(deleting) : '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                isPending={remove.isPending}
                onConfirm={() => {
                    if (deleting)
                        remove.mutate(deleting.id, {
                            onSuccess: () => setDeleting(null),
                            onError,
                        });
                }}
            />
        </div>
    );
}
