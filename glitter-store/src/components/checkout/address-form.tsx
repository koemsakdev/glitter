'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MapPicker } from '@/components/ui/map-picker';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { reverseGeocode } from '@/lib/geocode';
import { isValidPhone } from '@/lib/phone';
import { tr, type Lang } from '@/lib/locale';
import type { Address } from '@/lib/types';

const PRESET_LABELS = ['Home', 'Company', 'School', 'Other'];
const MAX_PHOTOS = 5;

interface Photo {
    id: string;
    preview: string;
    file?: File;
    url?: string;
}

export function AddressForm({
    lang,
    defaultName,
    defaultPhone,
    initial,
    onClose,
    onSaved,
}: {
    lang: Lang;
    defaultName: string;
    defaultPhone: string;
    initial?: Address;
    onClose: () => void;
    onSaved: (saved: Address) => void;
}) {
    const { authFetch } = useAuth();

    const [name, setName] = useState(initial?.recipientName || defaultName);
    const [phone, setPhone] = useState(initial?.recipientPhone || defaultPhone);
    const [street, setStreet] = useState(initial?.streetAddress ?? '');
    const [detail, setDetail] = useState(initial?.landmark ?? '');
    const presetMatch =
        initial?.label && PRESET_LABELS.includes(initial.label)
            ? initial.label
            : initial?.label
              ? 'Other'
              : 'Home';
    const [label, setLabel] = useState(presetMatch);
    const [otherLabel, setOtherLabel] = useState(
        presetMatch === 'Other' ? (initial?.label ?? '') : '',
    );
    const [isDefault, setIsDefault] = useState(
        initial?.isDefaultShipping ?? false,
    );
    const [lat, setLat] = useState<number | null>(
        initial?.latitude ? Number(initial.latitude) : null,
    );
    const [lng, setLng] = useState<number | null>(
        initial?.longitude ? Number(initial.longitude) : null,
    );
    const [locating, setLocating] = useState(false);

    const [photos, setPhotos] = useState<Photo[]>(() =>
        (initial?.imageUrls ?? []).map((u, i) => ({
            id: `e${i}`,
            url: u,
            preview: fileUrl(u) ?? '',
        })),
    );
    const fileRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function useCurrentLocation() {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                const la = p.coords.latitude;
                const ln = p.coords.longitude;
                setLat(la);
                setLng(ln);
                void reverseGeocode(la, ln).then((r) => {
                    if (r?.address) setStreet(r.address);
                });
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }

    function addPhotos(files: FileList | null) {
        if (!files) return;
        const slots = Math.max(0, MAX_PHOTOS - photos.length);
        const next = Array.from(files)
            .slice(0, slots)
            .map((file, i) => ({
                id: `n${Date.now()}_${i}`,
                file,
                preview: URL.createObjectURL(file),
            }));
        if (next.length) setPhotos((prev) => [...prev, ...next]);
        if (fileRef.current) fileRef.current.value = '';
    }

    function removePhoto(id: string) {
        setPhotos((prev) => {
            const target = prev.find((p) => p.id === id);
            if (target?.file) URL.revokeObjectURL(target.preview);
            return prev.filter((p) => p.id !== id);
        });
    }

    async function save() {
        setError('');
        if (!name.trim()) return setError(tr(lang, 'nameRequired'));
        if (!phone.trim()) return setError(tr(lang, 'phoneRequired'));
        if (!isValidPhone(phone)) return setError(tr(lang, 'invalidPhone'));
        if (!street.trim()) return setError(tr(lang, 'addressRequired'));

        setSaving(true);
        try {
            // Upload any new photos only now, on save.
            const imageUrls: string[] = [];
            for (const p of photos) {
                if (p.url) {
                    imageUrls.push(p.url);
                    continue;
                }
                if (p.file) {
                    const fd = new FormData();
                    fd.append('image', p.file);
                    const up = await authFetch(
                        '/api/account/addresses/upload',
                        { method: 'POST', body: fd },
                    );
                    if (!up.ok) throw new Error('upload failed');
                    imageUrls.push(((await up.json()) as { url: string }).url);
                }
            }

            const finalLabel =
                label === 'Other' ? otherLabel.trim() || 'Other' : label;
            const body = JSON.stringify({
                recipientName: name.trim(),
                recipientPhone: phone.trim(),
                streetAddress: street.trim(),
                landmark: detail.trim() || undefined,
                label: finalLabel,
                isDefaultShipping: isDefault,
                latitude: lat ?? undefined,
                longitude: lng ?? undefined,
                imageUrls,
            });

            const res = initial
                ? await authFetch(`/api/account/addresses/${initial.id}`, {
                      method: 'PATCH',
                      body,
                  })
                : await authFetch('/api/account/addresses', {
                      method: 'POST',
                      body,
                  });
            if (!res.ok) {
                const detail = (await res.json().catch(() => null)) as {
                    message?: string | string[];
                } | null;
                const msg = Array.isArray(detail?.message)
                    ? detail.message.join(', ')
                    : detail?.message;
                throw new Error(msg || tr(lang, 'addressSaveFailed'));
            }
            const json = (await res.json()) as { data: Address };
            photos.forEach((p) => p.file && URL.revokeObjectURL(p.preview));
            onSaved(json.data);
        } catch (e) {
            setError(
                e instanceof Error && e.message
                    ? e.message
                    : tr(lang, 'addressSaveFailed'),
            );
        } finally {
            setSaving(false);
        }
    }

    const rowInput =
        'w-full border-0 bg-transparent p-0 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none dark:text-zinc-100';

    return (
        <Sheet
            open
            onOpenChange={(o) => {
                if (!o) onClose();
            }}
        >
            <SheetContent className="sheet-adaptive inset-0 left-0 flex w-full max-w-none flex-col gap-0 overflow-hidden p-0 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-md sm:max-w-[92%]">
                {/* Header */}
                <div className="flex shrink-0 items-center border-b border-zinc-100 px-4 py-3.5 dark:border-zinc-800">
                    <SheetTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {initial
                            ? tr(lang, 'editAddress')
                            : tr(lang, 'addAddress')}
                    </SheetTitle>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 space-y-4 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950">
                    {/* Map */}
                    <MapPicker
                        latitude={lat}
                        longitude={lng}
                        height={200}
                        currentLocationText={tr(lang, 'useMyLocation')}
                        searchPlaceholder={tr(lang, 'chooseOnMap')}
                        addressText={street}
                        expandHint={tr(lang, 'openFullMap')}
                        confirmText={tr(lang, 'confirmLocation')}
                        onChange={(la, ln, addr) => {
                            setLat(la);
                            setLng(ln);
                            if (addr) setStreet(addr);
                        }}
                    />

                    {/* Place card */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
                        <p className="flex items-start gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                            <span className="min-w-0">
                                {street.trim() || tr(lang, 'addressFromMap')}
                            </span>
                        </p>
                        <button
                            type="button"
                            onClick={useCurrentLocation}
                            disabled={locating}
                            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-(--brand) disabled:opacity-60"
                        >
                            {locating ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <LocateFixed className="size-4" />
                            )}
                            {tr(lang, 'useMyLocation')}
                        </button>
                    </div>

                    {/* Field rows (iOS style) */}
                    <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl bg-white shadow-sm dark:divide-zinc-800 dark:bg-zinc-900">
                        <Row label={tr(lang, 'fullName')}>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={rowInput}
                            />
                        </Row>
                        <Row label={tr(lang, 'phone')}>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                inputMode="tel"
                                className={rowInput}
                            />
                        </Row>
                        <Row label={tr(lang, 'addressField')}>
                            <input
                                value={street}
                                onChange={(e) => setStreet(e.target.value)}
                                placeholder={tr(lang, 'addressFromMap')}
                                className={rowInput}
                            />
                        </Row>
                        <Row label={tr(lang, 'addressDetail')}>
                            <input
                                value={detail}
                                onChange={(e) => setDetail(e.target.value)}
                                placeholder={tr(lang, 'detailPlaceholder')}
                                className={rowInput}
                            />
                        </Row>
                        <Row label={tr(lang, 'addressLabel')} align="start">
                            <div className="flex flex-wrap gap-2">
                                {PRESET_LABELS.map((l) => (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => setLabel(l)}
                                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                            label === l
                                                ? 'border-(--brand) bg-(--brand)/10 text-(--brand)'
                                                : 'border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
                                        }`}
                                    >
                                        {tr(lang, `label_${l.toLowerCase()}`)}
                                    </button>
                                ))}
                                {label === 'Other' && (
                                    <input
                                        value={otherLabel}
                                        onChange={(e) =>
                                            setOtherLabel(e.target.value)
                                        }
                                        placeholder={tr(
                                            lang,
                                            'labelOtherPlaceholder',
                                        )}
                                        className="mt-1 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm outline-none focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                )}
                            </div>
                        </Row>
                        <Row label={tr(lang, 'setDefault')}>
                            <div className="flex justify-end">
                                <Switch
                                    checked={isDefault}
                                    onCheckedChange={setIsDefault}
                                    aria-label={tr(lang, 'setDefault')}
                                />
                            </div>
                        </Row>
                    </div>

                    {/* Reference photos (up to 5) */}
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'referencePhotos')}
                            <span className="ml-1 text-xs font-normal text-zinc-400">
                                ({photos.length}/{MAX_PHOTOS})
                            </span>
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {tr(lang, 'referenceHint')}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2.5">
                            {photos.map((p) => (
                                <div
                                    key={p.id}
                                    className="relative size-20 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={p.preview}
                                        alt=""
                                        className="size-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePhoto(p.id)}
                                        className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white"
                                        aria-label="remove"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </div>
                            ))}
                            {photos.length < MAX_PHOTOS && (
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="flex size-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 text-zinc-400 hover:border-(--brand) hover:text-(--brand) dark:border-zinc-600"
                                >
                                    <ImagePlus className="size-5" />
                                    <span className="text-[10px] font-medium">
                                        {tr(lang, 'addPhoto')}
                                    </span>
                                </button>
                            )}
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            hidden
                            onChange={(e) => addPhotos(e.target.files)}
                        />
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                {/* Sticky footer */}
                <div className="shrink-0 border-t border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving}
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 disabled:opacity-60"
                    >
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {tr(lang, 'save')}
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function Row({
    label,
    align = 'center',
    children,
}: {
    label: string;
    align?: 'center' | 'start';
    children: React.ReactNode;
}) {
    return (
        <div
            className={`flex gap-3 px-4 py-3 ${
                align === 'start' ? 'items-start' : 'items-center'
            }`}
        >
            <span className="w-20 shrink-0 pt-px text-sm text-zinc-500 dark:text-zinc-400">
                {label}
            </span>
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}
