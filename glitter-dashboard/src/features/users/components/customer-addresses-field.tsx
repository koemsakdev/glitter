'use client';

import { Loader2, MapPin, Pencil, Phone, Plus, Save, Star, Trash2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';
import type { Address } from '@/types/address';

const MapPicker = dynamic(
    () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/40">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);

const DEFAULT_LAT = 11.5564;
const DEFAULT_LNG = 104.9282;

/** A working copy of an address while it's being edited on the page. */
export interface AddressDraft {
    key: string;
    /** Present when this draft maps to an existing saved address. */
    id?: string;
    lat: number;
    lng: number;
    picked: boolean;
    addressText: string;
    city: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    note: string;
    isDefault: boolean;
}

export function addressToDraft(a: Address): AddressDraft {
    return {
        key: a.id,
        id: a.id,
        lat: a.latitude ? Number(a.latitude) : DEFAULT_LAT,
        lng: a.longitude ? Number(a.longitude) : DEFAULT_LNG,
        picked: Boolean(a.latitude),
        addressText: a.streetAddress,
        city: a.province ?? '',
        label: a.label ?? '',
        recipientName: a.recipientName,
        recipientPhone: a.recipientPhone,
        note: a.landmark ?? '',
        isDefault: a.isDefaultShipping,
    };
}

function blankDraft(makeDefault: boolean): AddressDraft {
    return {
        key:
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : String(Date.now() + Math.random()),
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        picked: false,
        addressText: '',
        city: '',
        label: '',
        recipientName: '',
        recipientPhone: '',
        note: '',
        isDefault: makeDefault,
    };
}

interface CustomerAddressesFieldProps {
    value: AddressDraft[];
    onChange: (next: AddressDraft[]) => void;
    /** Defaults used when an address omits its own recipient. */
    fallbackName?: string;
    fallbackPhone?: string;
}

export function CustomerAddressesField({
    value,
    onChange,
    fallbackName,
    fallbackPhone,
}: CustomerAddressesFieldProps) {
    const { t } = useI18n();
    const [draft, setDraft] = useState<AddressDraft | null>(null);
    const [isNew, setIsNew] = useState(false);

    // When there are no addresses yet, open the form straight away so the
    // user can fill it in (no empty-state / extra click).
    const autoOpenedRef = useRef(false);
    useEffect(() => {
        if (!autoOpenedRef.current && value.length === 0) {
            autoOpenedRef.current = true;
            const d = blankDraft(true);
            d.recipientName = fallbackName ?? '';
            d.recipientPhone = fallbackPhone ?? '';
            setDraft(d);
            setIsNew(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function openNew() {
        const d = blankDraft(value.length === 0);
        // Pre-fill the recipient with the customer's own name/phone; the user
        // can override either if the delivery contact is different.
        d.recipientName = fallbackName ?? '';
        d.recipientPhone = fallbackPhone ?? '';
        setDraft(d);
        setIsNew(true);
    }
    function openEdit(d: AddressDraft) {
        setDraft({ ...d });
        setIsNew(false);
    }
    function closeEditor() {
        setDraft(null);
    }

    function ensureOneDefault(list: AddressDraft[]): AddressDraft[] {
        if (list.length === 0) return list;
        if (list.some((d) => d.isDefault)) return list;
        return list.map((d, i) => (i === 0 ? { ...d, isDefault: true } : d));
    }

    function saveDraft() {
        if (!draft) return;
        let next: AddressDraft[];
        if (isNew) {
            next = [...value, draft];
        } else {
            next = value.map((d) => (d.key === draft.key ? draft : d));
        }
        if (draft.isDefault) {
            next = next.map((d) =>
                d.key === draft.key ? d : { ...d, isDefault: false },
            );
        }
        onChange(ensureOneDefault(next));
        closeEditor();
    }

    function removeDraft(key: string) {
        const removed = value.find((d) => d.key === key);
        let next = value.filter((d) => d.key !== key);
        if (removed?.isDefault) next = ensureOneDefault(next);
        onChange(next);
    }

    // ---- Editor panel ----
    if (draft) {
        const patch = (p: Partial<AddressDraft>) =>
            setDraft({ ...draft, ...p });
        return (
            <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
                <MapPicker
                    key={draft.key}
                    latitude={draft.lat}
                    longitude={draft.lng}
                    onChange={(lat, lng, address, city) =>
                        patch({
                            lat,
                            lng,
                            picked: true,
                            ...(address ? { addressText: address } : {}),
                            ...(city ? { city } : {}),
                        })
                    }
                    showCurrentLocation
                    reverseOnPick
                    autoLocate={isNew && !draft.picked}
                    currentLocationText={t('address.action.useCurrent')}
                    searchPlaceholder={t('address.field.searchPlace')}
                    height={300}
                />
                <div className="flex items-start gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-pink-500" />
                    <span
                        className={
                            draft.addressText
                                ? ''
                                : 'text-muted-foreground italic'
                        }
                    >
                        {draft.addressText || t('address.field.noneSelected')}
                    </span>
                </div>
                <Labeled label={t('address.field.label')}>
                    <Input
                        value={draft.label}
                        onChange={(e) => patch({ label: e.target.value })}
                        placeholder="Home"
                    />
                </Labeled>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Labeled label={t('address.field.recipientName')}>
                        <Input
                            value={draft.recipientName}
                            onChange={(e) =>
                                patch({ recipientName: e.target.value })
                            }
                            placeholder={
                                fallbackName || t('address.field.sameAsCustomer')
                            }
                        />
                    </Labeled>
                    <Labeled label={t('address.field.recipientPhone')}>
                        <Input
                            value={draft.recipientPhone}
                            onChange={(e) =>
                                patch({ recipientPhone: e.target.value })
                            }
                            placeholder={
                                fallbackPhone ||
                                t('address.field.sameAsCustomer')
                            }
                        />
                    </Labeled>
                </div>
                <Labeled label={t('address.field.landmark')}>
                    <Textarea
                        value={draft.note}
                        onChange={(e) => patch({ note: e.target.value })}
                        rows={2}
                        placeholder="Blue gate next to Angkor Market"
                    />
                </Labeled>
                <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                        checked={draft.isDefault}
                        onCheckedChange={(v) => patch({ isDefault: Boolean(v) })}
                    />
                    <span className="text-sm font-medium">
                        {t('address.field.defaultShipping')}
                    </span>
                </label>

                <div className="flex justify-end gap-2 pt-1">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={closeEditor}
                    >
                        <X className="size-4" />
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        disabled={!draft.picked || !draft.addressText.trim()}
                        onClick={saveDraft}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        <Save className="size-4" />
                        {t('phone.action.save')}
                    </Button>
                </div>
            </div>
        );
    }

    // ---- List ----
    return (
        <div className="space-y-3">
            {value.length === 0 ? (
                <div className="rounded-xl border border-dashed py-8 text-center">
                    <MapPin className="mx-auto size-7 text-muted-foreground/50" />
                    <p className="mt-2 text-sm text-muted-foreground">
                        {t('address.section.empty')}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {value.map((d) => (
                        <div
                            key={d.key}
                            className="flex items-start justify-between gap-3 rounded-xl border bg-card p-3"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-sm font-medium">
                                        {d.addressText}
                                    </span>
                                    {d.isDefault && (
                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
                                            <Star className="size-3" />
                                            {t('address.badge.default')}
                                        </Badge>
                                    )}
                                </div>
                                {(d.recipientPhone || d.recipientName) && (
                                    <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                        <Phone className="size-3" />
                                        {d.recipientPhone || fallbackPhone}
                                        {d.recipientName
                                            ? ` · ${d.recipientName}`
                                            : ''}
                                    </div>
                                )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => openEdit(d)}
                                >
                                    <Pencil className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    onClick={() => removeDraft(d.key)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openNew}
            >
                <Plus className="size-4" />
                {t('address.action.create')}
            </Button>
        </div>
    );
}

function Labeled({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}
