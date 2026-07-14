'use client';

import {
    GripVertical,
    Loader,
    MapPin,
    Pencil,
    Plus,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { DeliveryMethodFormDialog } from '@/features/settings/components/delivery-method-form-dialog';
import { PaymentOptionFormDialog } from '@/features/settings/components/payment-option-form-dialog';
import { RegionFormDialog } from '@/features/settings/components/region-form-dialog';
import {
    ABA_PAYMENT_TYPES,
    type DeliveryMethod,
    type DeliveryRegion,
    type PaymentOption,
    type StoreDelivery,
} from '@/features/settings/store-config';
import { getFileUrl } from '@/lib/file-url';
import { useI18n, type TranslationKey } from '@/lib/i18n';

const METHOD_TYPE_LABEL: Record<DeliveryMethod['type'], TranslationKey> = {
    delivery: 'settings.delivery.typeDelivery',
    pickup: 'settings.delivery.typePickup',
};

const PAYMENT_TYPE_LABEL: Record<PaymentOption['type'], TranslationKey> = {
    aba_khqr: 'settings.delivery.typeAbaKhqr',
    aba_ecommerce: 'settings.delivery.typeAbaEcom',
    cod: 'settings.delivery.typeCod',
};

const RULE_LABEL: Record<DeliveryMethod['payment'], TranslationKey> = {
    prepay: 'settings.delivery.rule.prepay',
    on_pickup: 'settings.delivery.rule.onReceive',
    either: 'settings.delivery.rule.either',
};

type DeleteTarget =
    | { kind: 'region' | 'method' | 'payment'; id: string; name: string }
    | null;

type Section = 'regions' | 'methods' | 'payments' | 'hold';

export function DeliveryConfigCard({
    value,
    saving = false,
    onChange,
}: {
    value: StoreDelivery;
    /** True while a save triggered from this card is in flight. */
    saving?: boolean;
    onChange: (next: StoreDelivery) => void;
}) {
    const { t } = useI18n();

    const regions = value.regions ?? [];
    const methods = value.methods ?? [];
    const payments = value.payments ?? [];

    // Which section the last change came from, so we only show the "Saving…"
    // indicator on that section's header.
    const [touched, setTouched] = useState<Section | null>(null);
    const commit = (section: Section, next: StoreDelivery) => {
        setTouched(section);
        onChange(next);
    };

    const [regionDialog, setRegionDialog] = useState<{
        editing: DeliveryRegion | null;
    } | null>(null);
    const [methodDialog, setMethodDialog] = useState<{
        editing: DeliveryMethod | null;
    } | null>(null);
    const [paymentDialog, setPaymentDialog] = useState<{
        editing: PaymentOption | null;
    } | null>(null);
    const [deleting, setDeleting] = useState<DeleteTarget>(null);
    // Drag-to-reorder state for the delivery methods list.
    const [dragMethodId, setDragMethodId] = useState<string | null>(null);
    const [overMethodId, setOverMethodId] = useState<string | null>(null);

    // ----- region mutations -----
    function upsertRegion(region: DeliveryRegion) {
        const exists = regions.some((r) => r.id === region.id);
        commit('regions', {
            ...value,
            regions: exists
                ? regions.map((r) => (r.id === region.id ? region : r))
                : [...regions, region],
        });
        setRegionDialog(null);
    }
    function deleteRegion(id: string) {
        if (regions.length <= 1) return;
        const remaining = regions.filter((r) => r.id !== id);
        const fallback = remaining[0].id;
        commit('regions', {
            ...value,
            regions: remaining,
            methods: methods.map((m) =>
                m.regionId === id ? { ...m, regionId: fallback } : m,
            ),
        });
    }

    // ----- method mutations -----
    function upsertMethod(method: DeliveryMethod) {
        const exists = methods.some((m) => m.id === method.id);
        commit('methods', {
            ...value,
            methods: exists
                ? methods.map((m) => (m.id === method.id ? method : m))
                : [...methods, method],
        });
        setMethodDialog(null);
    }
    function patchMethod(id: string, patch: Partial<DeliveryMethod>) {
        commit('methods', {
            ...value,
            methods: methods.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        });
    }
    function deleteMethod(id: string) {
        commit('methods', {
            ...value,
            methods: methods.filter((m) => m.id !== id),
        });
    }
    /** Drag-reorder: move method `fromId` to `toId`'s position. */
    function moveMethod(fromId: string, toId: string) {
        if (fromId === toId) return;
        const list = [...methods];
        const from = list.findIndex((m) => m.id === fromId);
        const to = list.findIndex((m) => m.id === toId);
        if (from < 0 || to < 0) return;
        const [moved] = list.splice(from, 1);
        list.splice(to, 0, moved);
        commit('methods', { ...value, methods: list });
    }

    // ----- payment option mutations -----
    function upsertPayment(option: PaymentOption) {
        const exists = payments.some((p) => p.id === option.id);
        commit('payments', {
            ...value,
            payments: exists
                ? payments.map((p) => (p.id === option.id ? option : p))
                : [...payments, option],
        });
        setPaymentDialog(null);
    }
    function patchPayment(id: string, patch: Partial<PaymentOption>) {
        commit('payments', {
            ...value,
            payments: payments.map((p) =>
                p.id === id ? { ...p, ...patch } : p,
            ),
        });
    }
    function deletePayment(id: string) {
        commit('payments', {
            ...value,
            payments: payments.filter((p) => p.id !== id),
        });
    }

    function confirmDelete() {
        if (!deleting) return;
        if (deleting.kind === 'region') deleteRegion(deleting.id);
        if (deleting.kind === 'method') deleteMethod(deleting.id);
        if (deleting.kind === 'payment') deletePayment(deleting.id);
        setDeleting(null);
    }

    const regionName = (id: string) => {
        const r = regions.find((x) => x.id === id);
        return r ? r.nameEn || r.nameKm || r.id : id;
    };

    return (
        <div className="space-y-6">
            {/* Regions */}
            <ListCard
                title={t('settings.delivery.regions')}
                note={t('settings.delivery.regionsNote')}
                addLabel={t('settings.delivery.addRegion')}
                saving={saving && touched === 'regions'}
                onAdd={() => setRegionDialog({ editing: null })}
            >
                {regions.map((r) => (
                    <Row
                        key={r.id}
                        iconUrl={r.iconUrl}
                        title={r.nameEn || r.nameKm || r.id}
                        subtitle={r.nameEn && r.nameKm ? r.nameKm : undefined}
                        onEdit={() => setRegionDialog({ editing: r })}
                        onDelete={
                            regions.length > 1
                                ? () =>
                                      setDeleting({
                                          kind: 'region',
                                          id: r.id,
                                          name: r.nameEn || r.nameKm || r.id,
                                      })
                                : undefined
                        }
                    />
                ))}
            </ListCard>

            {/* Delivery options */}
            <ListCard
                title={t('settings.delivery.methods')}
                note={t('settings.delivery.methodsNote')}
                addLabel={t('settings.delivery.addMethod')}
                saving={saving && touched === 'methods'}
                onAdd={() => setMethodDialog({ editing: null })}
            >
                {methods.map((m) => (
                    <Row
                        key={m.id}
                        iconUrl={m.iconUrl}
                        title={m.nameEn || m.nameKm || m.id}
                        subtitle={`${regionName(m.regionId)} · ${t(
                            METHOD_TYPE_LABEL[m.type],
                        )} · ${t(RULE_LABEL[m.payment])} · $${m.fee}`}
                        enabled={m.enabled}
                        onToggle={(v) => patchMethod(m.id, { enabled: v })}
                        onEdit={() => setMethodDialog({ editing: m })}
                        onDelete={() =>
                            setDeleting({
                                kind: 'method',
                                id: m.id,
                                name: m.nameEn || m.nameKm || m.id,
                            })
                        }
                        drag={{
                            dragging: dragMethodId === m.id,
                            over:
                                overMethodId === m.id &&
                                dragMethodId !== null &&
                                dragMethodId !== m.id,
                            onStart: () => setDragMethodId(m.id),
                            onEnter: () => {
                                if (dragMethodId) setOverMethodId(m.id);
                            },
                            onDrop: () => {
                                if (dragMethodId) moveMethod(dragMethodId, m.id);
                                setDragMethodId(null);
                                setOverMethodId(null);
                            },
                            onEnd: () => {
                                setDragMethodId(null);
                                setOverMethodId(null);
                            },
                        }}
                    />
                ))}
            </ListCard>

            {/* Payment options */}
            <ListCard
                title={t('settings.delivery.payments')}
                note={t('settings.delivery.paymentsNote')}
                addLabel={t('settings.delivery.addPayment')}
                saving={saving && touched === 'payments'}
                onAdd={() => setPaymentDialog({ editing: null })}
                addDisabled={
                    payments.some((p) => ABA_PAYMENT_TYPES.includes(p.type)) &&
                    payments.some((p) => p.type === 'cod')
                }
            >
                {payments.map((p) => (
                    <Row
                        key={p.id}
                        iconUrl={p.iconUrl}
                        title={p.nameEn || p.nameKm || p.id}
                        subtitle={t(PAYMENT_TYPE_LABEL[p.type])}
                        enabled={p.enabled}
                        onToggle={(v) => patchPayment(p.id, { enabled: v })}
                        onEdit={() => setPaymentDialog({ editing: p })}
                        onDelete={() =>
                            setDeleting({
                                kind: 'payment',
                                id: p.id,
                                name: p.nameEn || p.nameKm || p.id,
                            })
                        }
                    />
                ))}
            </ListCard>

            {/* Pay-first hold timeout */}
            <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold">
                                {t('settings.delivery.hold')}
                            </h3>
                            {saving && touched === 'hold' && (
                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Loader className="mb-0.5 size-3 animate-spin" />
                                    {t('common.saving')}
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {t('settings.delivery.holdNote')}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 px-5 py-4">
                    <input
                        type="number"
                        min={1}
                        value={value.holdMinutes ?? 30}
                        onChange={(e) =>
                            commit('hold', {
                                ...value,
                                holdMinutes: Math.max(
                                    1,
                                    Math.round(Number(e.target.value) || 0),
                                ),
                            })
                        }
                        className="h-11 w-28 rounded-lg border bg-background px-3 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                        {t('settings.delivery.holdMinutes')}
                    </span>
                </div>
            </div>

            {regionDialog && (
                <RegionFormDialog
                    open
                    region={regionDialog.editing}
                    onOpenChange={(o) => !o && setRegionDialog(null)}
                    onSave={upsertRegion}
                />
            )}
            {methodDialog && (
                <DeliveryMethodFormDialog
                    open
                    method={methodDialog.editing}
                    regions={regions}
                    onOpenChange={(o) => !o && setMethodDialog(null)}
                    onSave={upsertMethod}
                />
            )}
            {paymentDialog && (
                <PaymentOptionFormDialog
                    key={paymentDialog.editing?.id ?? 'new'}
                    open
                    option={paymentDialog.editing}
                    siblings={payments.filter(
                        (p) => p.id !== paymentDialog.editing?.id,
                    )}
                    onOpenChange={(o) => !o && setPaymentDialog(null)}
                    onSave={upsertPayment}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(o) => !o && setDeleting(null)}
                title={t('settings.delivery.deleteTitle')}
                description={t('settings.willBeRemoved').replace(
                    '{name}',
                    deleting?.name ?? '',
                )}
                confirmLabel={t('settings.confirmDelete')}
                cancelLabel={t('common.cancel')}
                variant="danger"
                onConfirm={confirmDelete}
            />
        </div>
    );
}

function ListCard({
    title,
    note,
    addLabel,
    saving,
    onAdd,
    addDisabled,
    children,
}: {
    title: string;
    note: string;
    addLabel: string;
    saving?: boolean;
    onAdd: () => void;
    addDisabled?: boolean;
    children: React.ReactNode;
}) {
    const { t } = useI18n();
    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold">{title}</h3>
                        {saving && (
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Loader className="size-3 animate-spin mb-0.5" />
                                {t('common.saving')}
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {note}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onAdd}
                    disabled={addDisabled}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <Plus className="size-3.5" />
                    {addLabel}
                </button>
            </div>
            <div className="divide-y">{children}</div>
        </div>
    );
}

function Row({
    iconUrl,
    title,
    subtitle,
    enabled,
    onToggle,
    onEdit,
    onDelete,
    drag,
}: {
    iconUrl: string;
    title: string;
    subtitle?: string;
    enabled?: boolean;
    onToggle?: (value: boolean) => void;
    onEdit: () => void;
    onDelete?: () => void;
    /** Enables HTML5 drag-to-reorder with a grip handle. */
    drag?: {
        dragging: boolean;
        over: boolean;
        onStart: () => void;
        onEnter: () => void;
        onDrop: () => void;
        onEnd: () => void;
    };
}) {
    const src = getFileUrl(iconUrl);
    // Only allow the drag to start from the grip handle (not the whole row).
    const [handleDown, setHandleDown] = useState(false);
    return (
        <div
            draggable={drag ? handleDown : undefined}
            onDragStart={drag?.onStart}
            onDragEnter={drag?.onEnter}
            onDragOver={drag ? (e) => e.preventDefault() : undefined}
            onDrop={
                drag
                    ? (e) => {
                          e.preventDefault();
                          drag.onDrop();
                      }
                    : undefined
            }
            onDragEnd={() => {
                setHandleDown(false);
                drag?.onEnd();
            }}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                drag?.dragging ? 'opacity-40' : ''
            } ${drag?.over ? 'bg-pink-50 dark:bg-pink-950/30' : ''}`}
        >
            {drag && (
                <button
                    type="button"
                    aria-label="Drag to reorder"
                    onMouseDown={() => setHandleDown(true)}
                    onMouseUp={() => setHandleDown(false)}
                    onTouchStart={() => setHandleDown(true)}
                    onTouchEnd={() => setHandleDown(false)}
                    className="-ml-1 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
                >
                    <GripVertical className="size-4" />
                </button>
            )}
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30">
                {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={src}
                        alt=""
                        className="size-full object-contain"
                    />
                ) : (
                    <MapPin className="size-4 text-muted-foreground/50" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{title}</p>
                {subtitle && (
                    <p className="truncate text-xs text-muted-foreground">
                        {subtitle}
                    </p>
                )}
            </div>
            {onToggle && (
                <Switch
                    size="lg"
                    checked={enabled ?? true}
                    onCheckedChange={(v) => onToggle(Boolean(v))}
                />
            )}
            <button
                type="button"
                onClick={onEdit}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
            >
                <Pencil className="size-4" />
            </button>
            <button
                type="button"
                onClick={onDelete}
                disabled={!onDelete}
                className="rounded-lg p-2 text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
                <Trash2 className="size-4" />
            </button>
        </div>
    );
}
