/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    ImagePlus,
    MapPin,
    Pencil,
    Plus,
    QrCode,
    Sparkles,
    Store,
    Trash2,
    Truck,
    X,
} from 'lucide-react';
import {
    fileUrl,
    formatPrice,
    validateVoucher,
    type VoucherValidation,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { MapPicker } from '@/components/ui/map-picker';
import { BackLink } from '@/components/ui/back-link';
import { AddressForm } from '@/components/checkout/address-form';
import { pick, tr, type Lang } from '@/lib/locale';
import type {
    DeliveryMethod,
    PaymentOption,
    StoreDelivery,
} from '@/lib/store-config';
import type { Address, Branch } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

export function CheckoutForm({
    branches,
    lang,
    delivery,
}: {
    branches: Branch[];
    lang: Lang;
    delivery: StoreDelivery;
}) {
    const { items, hydrated, subtotal, clear } = useCart();
    const { user, authFetch } = useAuth();

    const regions = delivery.regions ?? [];
    const methods = delivery.methods ?? [];
    const payments = delivery.payments ?? [];

    const [region, setRegion] = useState<string>(regions[0]?.id ?? '');
    const [methodId, setMethodId] = useState<string>(() => {
        const firstRegion = regions[0]?.id;
        return (
            methods.find((m) => m.enabled && m.regionId === firstRegion)?.id ??
            ''
        );
    });
    const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
    // For methods that let the customer choose (payment rule 'either').
    const [payChoice, setPayChoice] = useState<'now' | 'later'>('now');
    // Which QR payment option the customer picked (when paying now).
    const [payOptionId, setPayOptionId] = useState<string>('');

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [showMap, setShowMap] = useState(false);
    const [note, setNote] = useState('');

    // Selected delivery method + fee (needed by voucher validation below).
    const method = methods.find((m) => m.id === methodId);
    const fee = method?.fee ?? 0;

    // Voucher / promo
    const [voucherInput, setVoucherInput] = useState('');
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [discount, setDiscount] = useState(0);
    const [voucherName, setVoucherName] = useState<string | null>(null);
    const [voucherAuto, setVoucherAuto] = useState(false);
    const [voucherAppliesTo, setVoucherAppliesTo] = useState<
        'order' | 'delivery'
    >('order');
    const [voucherMsg, setVoucherMsg] = useState('');
    const [voucherLoading, setVoucherLoading] = useState(false);

    function reasonMsg(r: VoucherValidation): string {
        switch (r.reason) {
            case 'min_spend':
                return tr(lang, 'voucherMinSpend').replace(
                    '{amount}',
                    formatPrice(r.minSpend ?? 0),
                );
            case 'expired':
                return tr(lang, 'voucherExpired');
            case 'not_started':
                return tr(lang, 'voucherNotStarted');
            case 'used_up':
                return tr(lang, 'voucherUsedUp');
            case 'login_required':
                return tr(lang, 'voucherLoginRequired');
            case 'new_customer':
                return tr(lang, 'voucherNewOnly');
            default:
                return tr(lang, 'voucherInvalid');
        }
    }

    // Logged-in customers validate through the account endpoint so customer
    // restrictions (new customers) are evaluated; guests use the public one.
    async function runValidate(code?: string): Promise<VoucherValidation> {
        if (user) {
            try {
                const res = await authFetch(
                    '/api/account/vouchers/validate',
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            subtotal,
                            code: code || undefined,
                            shippingFee: fee,
                        }),
                    },
                );
                if (!res.ok) return { valid: false };
                const json = (await res.json()) as { data: VoucherValidation };
                return json.data;
            } catch {
                return { valid: false };
            }
        }
        return validateVoucher(subtotal, code, fee);
    }

    // Keep the discount in sync with the subtotal: re-validate an applied code
    // (it may drop below min spend) or fetch the best automatic promo.
    useEffect(() => {
        let cancelled = false;
        async function sync() {
            if (subtotal <= 0) {
                setDiscount(0);
                setVoucherName(null);
                setVoucherAuto(false);
                return;
            }
            const result = await runValidate(appliedCode ?? undefined);
            if (cancelled) return;
            if (result.valid) {
                setDiscount(result.discount ?? 0);
                setVoucherAppliesTo(result.appliesTo ?? 'order');
                setVoucherName(
                    pick(lang, result.nameEn ?? '', result.nameKm ?? '') ||
                        null,
                );
                setVoucherAuto(!appliedCode);
            } else {
                if (appliedCode) {
                    setAppliedCode(null);
                    setVoucherMsg(reasonMsg(result));
                }
                setDiscount(0);
                setVoucherName(null);
                setVoucherAuto(false);
            }
        }
        void sync();
        return () => {
            cancelled = true;
        };
        // reasonMsg is stable enough for our purposes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [subtotal, appliedCode, lang, fee]);

    async function applyVoucher() {
        const code = voucherInput.trim();
        if (!code) return;
        setVoucherLoading(true);
        setVoucherMsg('');
        const result = await runValidate(code);
        setVoucherLoading(false);
        if (result.valid) {
            setAppliedCode(code.toUpperCase());
            setDiscount(result.discount ?? 0);
            setVoucherAppliesTo(result.appliesTo ?? 'order');
            setVoucherName(
                pick(lang, result.nameEn ?? '', result.nameKm ?? '') || null,
            );
            setVoucherAuto(false);
        } else {
            setVoucherMsg(reasonMsg(result));
        }
    }

    function removeVoucher() {
        setAppliedCode(null);
        setVoucherInput('');
        setVoucherMsg('');
    }

    const [addresses, setAddresses] = useState<Address[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<string>('');
    const [addressModal, setAddressModal] = useState<{
        editing: Address | null;
    } | null>(null);

    const [proof, setProof] = useState<{ file: File; preview: string } | null>(
        null,
    );
    const proofRef = useRef<HTMLInputElement>(null);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [placed, setPlaced] = useState<string | null>(null);

    const loadAddresses = useCallback(
        async (selectId?: string) => {
            try {
                const r = await authFetch('/api/account/addresses');
                if (!r.ok) return;
                const d = (await r.json()) as { data?: Address[] };
                const list = d.data ?? [];
                setAddresses(list);
                const pickId =
                    selectId ??
                    (list.find((a) => a.isDefaultShipping) ?? list[0])?.id;
                if (pickId) {
                    const found = list.find((a) => a.id === pickId);
                    if (found) applyAddress(found);
                }
            } catch {
                // ignore
            }
        },
        [authFetch],
    );

    useEffect(() => {
        if (!user) return;
        setName((n) => n || user.fullName || '');
        setPhone((p) => p || user.phoneNumber || '');
        void loadAddresses();
    }, [user, loadAddresses]);

    async function deleteAddress(id: string) {
        try {
            await authFetch(`/api/account/addresses/${id}`, {
                method: 'DELETE',
            });
        } catch {
            // ignore
        }
        if (selectedAddressId === id) setSelectedAddressId('');
        void loadAddresses();
    }

    // ---- derived config ----
    const available = methods.filter(
        (m) => m.enabled && m.regionId === region,
    );
    // Keep `methodId` valid when the region changes.
    useEffect(() => {
        if (!available.some((m) => m.id === methodId)) {
            setMethodId(available[0]?.id ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [region]);

    const isPickup = method?.type === 'pickup';
    const needsAddress = method?.type === 'delivery';
    const rule = method?.payment ?? 'prepay';
    // Discount reduces whichever part it targets, so it always comes off the
    // combined total (order promos ≤ subtotal, delivery promos ≤ fee).
    const grandTotal = Math.max(0, subtotal + fee - discount);

    // Enabled payment options, split by kind. External options aren't offered
    // at checkout until a provider is wired.
    const qrOptions = payments.filter((p) => p.enabled && p.type === 'qr');
    const onReceiveOption = payments.find(
        (p) => p.enabled && p.type === 'on_delivery',
    );

    const offersChoice = rule === 'either';
    const payNow = rule === 'prepay' || (offersChoice && payChoice === 'now');
    const selectedQr =
        qrOptions.find((p) => p.id === payOptionId) ?? qrOptions[0];
    const usesKhqr = payNow && Boolean(selectedQr);

    const chosenOption: PaymentOption | undefined = usesKhqr
        ? selectedQr
        : onReceiveOption;

    if (!hydrated) {
        return <div className="mx-auto max-w-5xl px-4 py-16" />;
    }

    if (placed !== null) {
        return (
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
                    <Check className="size-8" />
                </div>
                <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'orderPlaced')}
                </h1>
                {placed && (
                    <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'orderNumber')}:{' '}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {placed}
                        </span>
                    </p>
                )}
                <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'orderPlacedHelp')}
                </p>
                <div className="mt-7 flex justify-center gap-3">
                    <Link
                        href="/products"
                        className="rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                    >
                        {tr(lang, 'continueShopping')}
                    </Link>
                    {user && (
                        <Link
                            href="/account"
                            className="rounded-full border border-zinc-200 px-6 py-3 text-sm font-semibold text-zinc-700 hover:border-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                        >
                            {tr(lang, 'myOrders')}
                        </Link>
                    )}
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-xl px-4 py-24 text-center">
                <p className="text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'cartEmpty')}
                </p>
                <Link
                    href="/products"
                    className="mt-6 inline-flex rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                    {tr(lang, 'continueShopping')}
                </Link>
            </div>
        );
    }

    function applyAddress(a: Address) {
        setSelectedAddressId(a.id);
        setName(a.recipientName);
        setPhone(a.recipientPhone);
        setAddress([a.streetAddress, a.landmark].filter(Boolean).join(' — '));
        setLat(a.latitude ? Number(a.latitude) : null);
        setLng(a.longitude ? Number(a.longitude) : null);
    }

    function onPickProof(file: File | null) {
        if (!file) return;
        if (proof) URL.revokeObjectURL(proof.preview);
        setProof({ file, preview: URL.createObjectURL(file) });
        setError('');
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return setError(tr(lang, 'nameRequired'));
        if (!phone.trim()) return setError(tr(lang, 'phoneRequired'));
        if (needsAddress && !address.trim())
            return setError(tr(lang, 'addressRequired'));
        if (isPickup && !branchId) return setError(tr(lang, 'branchRequired'));
        if (usesKhqr && !proof) return setError(tr(lang, 'proofRequired'));

        setSubmitting(true);
        try {
            let paymentProofUrl: string | undefined;
            if (usesKhqr && proof) {
                const fd = new FormData();
                fd.append('image', proof.file);
                const up = await fetch(`${API_URL}/api/orders/payment-proof`, {
                    method: 'POST',
                    body: fd,
                });
                if (!up.ok) throw new Error('upload failed');
                paymentProofUrl = ((await up.json()) as { url: string }).url;
            }

            const regionObj = regions.find((r) => r.id === region);
            const body = JSON.stringify({
                deliveryRegion: region,
                deliveryRegionName: regionObj?.nameEn ?? region,
                deliveryMethod: methodId,
                deliveryMethodName: method?.nameEn ?? method?.nameKm ?? methodId,
                branchId: isPickup ? branchId : undefined,
                customerName: name.trim(),
                customerPhone: phone.trim(),
                deliveryAddress: needsAddress ? address.trim() : undefined,
                deliveryLat: needsAddress && lat != null ? lat : undefined,
                deliveryLng: needsAddress && lng != null ? lng : undefined,
                paymentMethod:
                    chosenOption?.id ?? (isPickup ? 'on_pickup' : 'cod'),
                paymentMethodName:
                    chosenOption?.nameEn ?? chosenOption?.nameKm ?? '',
                paymentProofUrl,
                voucherCode: appliedCode ?? undefined,
                note: note.trim() || undefined,
                items: items.map((i) => ({
                    productVariantId: i.variantId,
                    quantity: i.quantity,
                })),
            });

            const res = user
                ? await authFetch('/api/account/orders', {
                      method: 'POST',
                      body,
                  })
                : await fetch(`${API_URL}/api/orders/online`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body,
                  });
            if (!res.ok) throw new Error('failed');
            const json: { data?: { orderNumber?: string; id?: string } } =
                await res.json();
            if (proof) URL.revokeObjectURL(proof.preview);
            clear();
            setPlaced(json.data?.orderNumber ?? json.data?.id ?? '');
        } catch {
            setError(tr(lang, 'orderFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900';

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
            <BackLink lang={lang} fallbackHref="/cart" className="mb-3" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'checkout')}
            </h1>

            <form
                onSubmit={submit}
                className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]"
            >
                <div className="space-y-6">
                    {/* 1 — Region */}
                    <Section step={1} title={tr(lang, 'shippingRegion')}>
                        <div className="flex gap-1.5 rounded-2xl bg-zinc-100 p-1.5 dark:bg-zinc-800/60">
                            {regions.map((r) => {
                                const icon = fileUrl(r.iconUrl);
                                const active = region === r.id;
                                return (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRegion(r.id)}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                                            active
                                                ? 'bg-white text-(--brand) shadow-sm dark:bg-zinc-900'
                                                : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        {icon && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={icon}
                                                alt=""
                                                className="size-5 rounded-full object-cover"
                                            />
                                        )}
                                        {pick(lang, r.nameEn, r.nameKm)}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>

                    {/* 2 — Delivery method */}
                    <Section step={2} title={tr(lang, 'deliveryMethod')}>
                        <div className="space-y-2.5">
                            {available.map((m) => (
                                <MethodCard
                                    key={m.id}
                                    method={m}
                                    lang={lang}
                                    active={methodId === m.id}
                                    onSelect={() => setMethodId(m.id)}
                                />
                            ))}
                            {available.length === 0 && (
                                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:bg-zinc-900/60">
                                    {tr(lang, 'noMethodsForRegion')}
                                </p>
                            )}
                        </div>

                        {isPickup && (
                            <div className="mt-4">
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">
                                    {tr(lang, 'pickupBranch')}
                                </label>
                                <select
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    className={inputClass}
                                >
                                    <option value="">
                                        {tr(lang, 'selectBranch')}
                                    </option>
                                    {branches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {pick(
                                                lang,
                                                b.branchNameEn,
                                                b.branchNameKm,
                                            )}{' '}
                                            — {b.streetAddress}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </Section>

                    {/* 3 — Payment */}
                    <Section step={3} title={tr(lang, 'payment')}>
                        {offersChoice && (
                            <div className="mb-4 grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPayChoice('now')}
                                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                                        payChoice === 'now'
                                            ? 'border-(--brand) bg-(--brand)/5 text-(--brand)'
                                            : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200'
                                    }`}
                                >
                                    {tr(lang, 'payNowKhqr')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPayChoice('later')}
                                    className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
                                        payChoice === 'later'
                                            ? 'border-(--brand) bg-(--brand)/5 text-(--brand)'
                                            : 'border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200'
                                    }`}
                                >
                                    {tr(
                                        lang,
                                        isPickup ? 'payAtStore' : 'payOnDelivery',
                                    )}
                                </button>
                            </div>
                        )}

                        {payNow ? (
                            selectedQr ? (
                                <div className="space-y-3">
                                    {/* Choose which QR provider, if more than one */}
                                    {qrOptions.length > 1 && (
                                        <div className="grid gap-2.5 sm:grid-cols-2">
                                            {qrOptions.map((o) => {
                                                const icon = fileUrl(o.iconUrl);
                                                const active =
                                                    selectedQr.id === o.id;
                                                return (
                                                    <button
                                                        key={o.id}
                                                        type="button"
                                                        onClick={() =>
                                                            setPayOptionId(o.id)
                                                        }
                                                        className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                                                            active
                                                                ? 'border-(--brand) bg-(--brand)/5 ring-1 ring-(--brand)/30'
                                                                : 'border-zinc-200 hover:border-(--brand)/40 dark:border-zinc-700'
                                                        }`}
                                                    >
                                                        <span
                                                            className={`flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${
                                                                icon
                                                                    ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                                                                    : 'border-transparent bg-zinc-100 dark:bg-zinc-800'
                                                            }`}
                                                        >
                                                            {icon ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={icon}
                                                                    alt=""
                                                                    className="size-full object-contain p-1"
                                                                />
                                                            ) : (
                                                                <QrCode className="size-5 text-zinc-400" />
                                                            )}
                                                        </span>
                                                        <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                            {pick(
                                                                lang,
                                                                o.nameEn,
                                                                o.nameKm,
                                                            )}
                                                        </span>
                                                        <span
                                                            className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                                                active
                                                                    ? 'border-(--brand) bg-(--brand)'
                                                                    : 'border-zinc-300 dark:border-zinc-600'
                                                            }`}
                                                        >
                                                            {active && (
                                                                <Check className="size-3 text-white" />
                                                            )}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {tr(lang, 'scanToPay')}{' '}
                                            <span className="text-(--brand)">
                                                {formatPrice(grandTotal)}
                                            </span>
                                        </p>
                                        <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                                            {fileUrl(selectedQr.qrImageUrl) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={
                                                        fileUrl(
                                                            selectedQr.qrImageUrl,
                                                        ) as string
                                                    }
                                                    alt="QR"
                                                    className="size-44 rounded-2xl border border-zinc-200 bg-white object-contain p-2.5 shadow-sm dark:border-zinc-700"
                                                />
                                            ) : (
                                                <div className="flex size-44 items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-3 text-center text-xs text-zinc-400 dark:border-zinc-600">
                                                    {tr(
                                                        lang,
                                                        'khqrNotConfigured',
                                                    )}
                                                </div>
                                            )}
                                            <div className="flex-1 text-sm">
                                                {selectedQr.accountName && (
                                                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {selectedQr.accountName}
                                                    </p>
                                                )}
                                                {selectedQr.note && (
                                                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                        {selectedQr.note}
                                                    </p>
                                                )}
                                                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {tr(lang, 'uploadProofHelp')}
                                                </p>
                                                <div className="mt-3">
                                                    {proof ? (
                                                        <div className="relative inline-block">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={
                                                                    proof.preview
                                                                }
                                                                alt=""
                                                                className="size-24 rounded-lg border border-zinc-200 object-cover dark:border-zinc-700"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    URL.revokeObjectURL(
                                                                        proof.preview,
                                                                    );
                                                                    setProof(
                                                                        null,
                                                                    );
                                                                }}
                                                                className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-zinc-900 text-white"
                                                                aria-label="remove"
                                                            >
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                proofRef.current?.click()
                                                            }
                                                            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 hover:border-(--brand) hover:text-(--brand) dark:border-zinc-600 dark:text-zinc-300"
                                                        >
                                                            <ImagePlus className="size-4" />
                                                            {tr(
                                                                lang,
                                                                'uploadProof',
                                                            )}
                                                        </button>
                                                    )}
                                                    <input
                                                        ref={proofRef}
                                                        type="file"
                                                        accept="image/*"
                                                        hidden
                                                        onChange={(e) =>
                                                            onPickProof(
                                                                e.target
                                                                    .files?.[0] ??
                                                                    null,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                                    {tr(lang, 'khqrNotConfigured')}
                                </p>
                            )
                        ) : (
                            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                                {isPickup
                                    ? tr(lang, 'payAtStoreHelp')
                                    : tr(lang, 'payOnDeliveryHelp')}
                            </p>
                        )}
                    </Section>

                    {/* 4 — Customer info / address */}
                    <Section step={4} title={tr(lang, 'yourInfo')}>
                        {user && needsAddress ? (
                            <div className="space-y-2">
                                {addresses.map((a) => (
                                    <div
                                        key={a.id}
                                        className={`flex items-start gap-2 rounded-xl border p-3 transition-colors ${
                                            selectedAddressId === a.id
                                                ? 'border-(--brand) bg-(--brand)/5'
                                                : 'border-zinc-200 dark:border-zinc-700'
                                        }`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => applyAddress(a)}
                                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                                        >
                                            <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                            <span className="min-w-0 text-sm">
                                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {a.label
                                                        ? `${a.label} · `
                                                        : ''}
                                                    {a.recipientName} ·{' '}
                                                    {a.recipientPhone}
                                                </span>
                                                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {[a.streetAddress, a.landmark]
                                                        .filter(Boolean)
                                                        .join(' — ')}
                                                </span>
                                            </span>
                                        </button>
                                        <div className="flex shrink-0 gap-0.5">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAddressModal({
                                                        editing: a,
                                                    })
                                                }
                                                aria-label={tr(lang, 'edit')}
                                                className="rounded-lg p-1.5 text-zinc-400 hover:text-(--brand)"
                                            >
                                                <Pencil className="size-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteAddress(a.id)
                                                }
                                                aria-label={tr(lang, 'delete')}
                                                className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setAddressModal({ editing: null })
                                    }
                                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 p-2.5 text-sm font-medium text-zinc-500 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-600"
                                >
                                    <Plus className="size-4" />
                                    {tr(lang, 'addAddress')}
                                </button>
                                {addresses.length === 0 && (
                                    <p className="text-center text-xs text-zinc-400">
                                        {tr(lang, 'noAddressYet')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            {tr(lang, 'fullName')}
                                        </label>
                                        <input
                                            value={name}
                                            onChange={(e) =>
                                                setName(e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            {tr(lang, 'phone')}
                                        </label>
                                        <input
                                            value={phone}
                                            onChange={(e) =>
                                                setPhone(e.target.value)
                                            }
                                            className={inputClass}
                                        />
                                    </div>
                                </div>

                                {needsAddress && (
                                    <div>
                                        <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                            {tr(lang, 'deliveryAddress')}
                                        </label>
                                        <textarea
                                            value={address}
                                            onChange={(e) =>
                                                setAddress(e.target.value)
                                            }
                                            rows={2}
                                            placeholder={tr(
                                                lang,
                                                'addressPlaceholder',
                                            )}
                                            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowMap((v) => !v)}
                                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-(--brand)"
                                        >
                                            <MapPin className="size-3.5" />
                                            {lat != null
                                                ? tr(lang, 'pinSet')
                                                : tr(lang, 'pinOnMap')}
                                        </button>
                                        {showMap && (
                                            <div className="mt-2">
                                                <MapPicker
                                                    latitude={lat}
                                                    longitude={lng}
                                                    onChange={(la, ln, addr) => {
                                                        setLat(la);
                                                        setLng(ln);
                                                        if (addr)
                                                            setAddress(addr);
                                                    }}
                                                    currentLocationText={tr(
                                                        lang,
                                                        'useMyLocation',
                                                    )}
                                                    searchPlaceholder={tr(
                                                        lang,
                                                        'searchPlace',
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3">
                            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                {tr(lang, 'orderNote')}
                            </label>
                            <input
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={tr(lang, 'notePlaceholder')}
                                className={inputClass}
                            />
                        </div>
                    </Section>
                </div>

                {/* Summary */}
                <div className="lg:sticky lg:top-24 lg:h-fit">
                    <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'orderSummary')}
                        </h2>
                        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                            {items.map((i) => (
                                <li
                                    key={i.variantId}
                                    className="flex items-center justify-between gap-2 text-sm"
                                >
                                    <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                                        {pick(lang, i.nameEn, i.nameKm)}
                                        <span className="text-zinc-400">
                                            {' '}
                                            × {i.quantity}
                                        </span>
                                    </span>
                                    <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                                        {formatPrice(i.unitPrice * i.quantity)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {/* Voucher / promo code */}
                        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                            {appliedCode ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                                    <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                        <Check className="size-4 shrink-0" />
                                        <span className="font-mono">
                                            {appliedCode}
                                        </span>
                                        {voucherName && (
                                            <span className="truncate text-emerald-600/80 dark:text-emerald-300/70">
                                                · {voucherName}
                                            </span>
                                        )}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={removeVoucher}
                                        className="shrink-0 text-xs font-medium text-emerald-700 underline dark:text-emerald-300"
                                    >
                                        {tr(lang, 'remove')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        value={voucherInput}
                                        onChange={(e) =>
                                            setVoucherInput(e.target.value)
                                        }
                                        placeholder={tr(lang, 'promoCode')}
                                        className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm uppercase outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={applyVoucher}
                                        disabled={
                                            voucherLoading ||
                                            !voucherInput.trim()
                                        }
                                        className="rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
                                    >
                                        {tr(lang, 'apply')}
                                    </button>
                                </div>
                            )}
                            {voucherAuto && discount > 0 && !appliedCode && (
                                <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                    <Sparkles className="size-3" />
                                    {voucherName ?? tr(lang, 'promoAuto')}
                                </p>
                            )}
                            {voucherMsg && (
                                <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                                    {voucherMsg}
                                </p>
                            )}
                        </div>

                        <div className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                            <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'subtotal')}
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(subtotal)}
                                </span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                        {voucherAppliesTo === 'delivery'
                                            ? tr(lang, 'deliveryDiscount')
                                            : tr(lang, 'discount')}
                                    </span>
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        −{formatPrice(discount)}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'deliveryFee')}
                                </span>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                    {fee > 0
                                        ? formatPrice(fee)
                                        : tr(lang, 'free')}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {tr(lang, 'total')}
                            </span>
                            <span className="text-lg font-extrabold text-(--brand)">
                                {formatPrice(grandTotal)}
                            </span>
                        </div>

                        {error && (
                            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-5 w-full rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                            {submitting
                                ? tr(lang, 'placingOrder')
                                : tr(lang, 'placeOrder')}
                        </button>
                    </div>
                </div>
            </form>

            {addressModal && (
                <AddressForm
                    lang={lang}
                    defaultName={user?.fullName ?? ''}
                    defaultPhone={user?.phoneNumber ?? ''}
                    initial={addressModal.editing ?? undefined}
                    onClose={() => setAddressModal(null)}
                    onSaved={(saved) => {
                        setAddressModal(null);
                        void loadAddresses(saved.id);
                    }}
                />
            )}
        </div>
    );
}

function MethodCard({
    method,
    lang,
    active,
    onSelect,
}: {
    method: DeliveryMethod;
    lang: Lang;
    active: boolean;
    onSelect: () => void;
}) {
    const icon = fileUrl(method.iconUrl);
    const Fallback = method.type === 'pickup' ? Store : Truck;
    const free = method.fee <= 0;
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`group flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left transition-all ${
                active
                    ? 'border-(--brand) bg-(--brand)/5 ring-1 ring-(--brand)/30'
                    : 'border-zinc-200 hover:border-(--brand)/40 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/50'
            }`}
        >
            <span
                className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border transition-colors ${
                    icon
                        ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                        : active
                          ? 'border-transparent bg-(--brand)/10 text-(--brand)'
                          : 'border-transparent bg-zinc-100 text-zinc-400 dark:bg-zinc-800'
                }`}
            >
                {icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={icon}
                        alt=""
                        className="size-full object-contain"
                    />
                ) : (
                    <Fallback className="size-6" />
                )}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {pick(lang, method.nameEn, method.nameKm)}
                </span>
                <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        free
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-(--brand)/10 text-(--brand)'
                    }`}
                >
                    {free ? tr(lang, 'free') : formatPrice(method.fee)}
                </span>
            </span>
            <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    active
                        ? 'border-(--brand) bg-(--brand)'
                        : 'border-zinc-300 dark:border-zinc-600'
                }`}
            >
                {active && <Check className="size-3 text-white" />}
            </span>
        </button>
    );
}

function Section({
    step,
    title,
    children,
}: {
    step: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-4 flex items-center gap-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <span className="flex size-6 items-center justify-center rounded-full bg-(--brand) text-xs font-bold text-white">
                    {step}
                </span>
                {title}
            </h2>
            {children}
        </div>
    );
}
