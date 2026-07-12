/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
    Banknote,
    Check,
    MapPin,
    Pencil,
    Plus,
    QrCode,
    Sparkles,
    Store,
    Trash2,
    Truck,
    Loader2,
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
import type { DeliveryMethod, StoreDelivery } from '@/lib/store-config';
import type { Address, Branch } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// ABA's checkout.prod.js (loaded in the root layout) defines `AbaPayway` as a
// top-level `const`, so it lives in the global lexical scope — NOT on `window`.
// Reference it as a bare global, guarded by `typeof` so it can't throw before
// the script has loaded.
declare const AbaPayway: { checkout: () => void } | undefined;

function getAbaPayway(): { checkout: () => void } | undefined {
    return typeof AbaPayway === 'undefined' ? undefined : AbaPayway;
}

/** Resolve once ABA's bridge is ready (script may still be loading), or false. */
function waitForAba(timeoutMs = 8000): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        if (getAbaPayway()?.checkout) return resolve(true);
        let waited = 0;
        const step = 100;
        const t = setInterval(() => {
            if (getAbaPayway()?.checkout) {
                clearInterval(t);
                resolve(true);
            } else if ((waited += step) >= timeoutMs) {
                clearInterval(t);
                resolve(false);
            }
        }, step);
    });
}

/**
 * Build the signed hidden <form id="aba_merchant_request" target="aba_webservice">
 * and call `AbaPayway.checkout()`, which finds that form and opens ABA's own
 * checkout modal/iframe. Returns false if the bridge isn't available.
 */
function openAbaCheckout(
    actionUrl: string,
    fields: Record<string, string>,
): boolean {
    const aba = getAbaPayway();
    if (!aba?.checkout) return false;

    document.getElementById('aba_merchant_request')?.remove();
    const form = document.createElement('form');
    form.id = 'aba_merchant_request';
    form.method = 'POST';
    form.action = actionUrl;
    form.target = 'aba_webservice';
    form.style.display = 'none';
    for (const [name, value] of Object.entries(fields)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value ?? '';
        form.appendChild(input);
    }
    document.body.appendChild(form);
    aba.checkout();
    return true;
}

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
    // Which payment method the customer picked ('khqr' | 'cod').
    const [payMethodId, setPayMethodId] = useState<string>('');

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

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [placed, setPlaced] = useState<string | null>(null);

    // ABA PayWay — while ABA's own checkout modal is open, poll for payment.
    const [abaPay, setAbaPay] = useState<{
        tranId: string;
        orderNumber: string;
    } | null>(null);
    // Verified receipt shown on the success screen.
    const [receipt, setReceipt] = useState<{
        tranId: string;
        apv: string;
        amount: string;
        currency: string;
        date: string;
        payer: string;
    } | null>(null);

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

    // Poll ABA for payment confirmation while the KHQR modal is open.
    useEffect(() => {
        if (!abaPay) return;
        const id = setInterval(async () => {
            try {
                const r = await fetch(
                    `${API_URL}/api/payments/aba/status/${abaPay.tranId}`,
                );
                const d = (await r.json()) as {
                    paid?: boolean;
                    detail?: {
                        tranId: string;
                        apv: string;
                        amount: string;
                        currency: string;
                        date: string;
                        payer: string;
                    };
                };
                if (d.paid) {
                    clearInterval(id);
                    clear();
                    if (d.detail) setReceipt(d.detail);
                    setAbaPay(null);
                    setPlaced(abaPay.orderNumber);
                }
            } catch {
                // keep polling
            }
        }, 4000);
        return () => clearInterval(id);
    }, [abaPay, clear]);

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

    // The delivery method's payment rule decides what's shown:
    //   on_pickup → pay on delivery (no payment picker at all)
    //   prepay    → must pay online now (KHQR options)
    //   either    → choose an online option OR pay on delivery
    const payOnDeliveryOnly = rule === 'on_pickup';
    const allowsNow = rule === 'prepay' || rule === 'either';
    const allowsCash = rule === 'either';

    // Enabled payment options from the admin's list. aba_khqr + khqr both pay
    // online via ABA; cod is pay-on-receipt.
    const onlineOptions = payments.filter(
        (p) => p.enabled && (p.type === 'aba_khqr' || p.type === 'khqr'),
    );
    const cashOption = payments.find((p) => p.enabled && p.type === 'cod');

    const payMethods: {
        id: string;
        now: boolean;
        title: string;
        desc: string;
        color: string;
        Icon: typeof QrCode;
        iconUrl: string | null;
    }[] = [];
    if (allowsNow) {
        for (const o of onlineOptions) {
            payMethods.push({
                id: o.id,
                now: true,
                title: pick(lang, o.nameEn, o.nameKm) || tr(lang, 'payKhqrTitle'),
                desc:
                    pick(lang, o.descEn, o.descKm) || tr(lang, 'payKhqrDesc'),
                color: o.color || '#00529C',
                Icon: QrCode,
                iconUrl: fileUrl(o.iconUrl),
            });
        }
    }
    if (allowsCash && cashOption) {
        payMethods.push({
            id: cashOption.id,
            now: false,
            title:
                pick(lang, cashOption.nameEn, cashOption.nameKm) ||
                tr(lang, 'payOnDelivery'),
            desc:
                pick(lang, cashOption.descEn, cashOption.descKm) ||
                (isPickup
                    ? tr(lang, 'payAtStoreHelp')
                    : tr(lang, 'payOnDeliveryHelp')),
            color: cashOption.color || '#16a34a',
            Icon: Banknote,
            iconUrl: fileUrl(cashOption.iconUrl),
        });
    }
    const selectedPay =
        payMethods.find((p) => p.id === payMethodId) ?? payMethods[0];
    const payNow = selectedPay?.now === true;
    const usesKhqr = payNow;

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
                {receipt && (
                    <div className="mx-auto mt-6 max-w-sm overflow-hidden rounded-2xl border border-emerald-200 text-left dark:border-emerald-500/25">
                        <div className="flex items-center gap-2 bg-emerald-50 px-5 py-3 dark:bg-emerald-500/10">
                            <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                                {tr(lang, 'paymentReceived')}
                            </span>
                            <span className="ml-auto rounded-full bg-[#00529C] px-2 py-0.5 text-[10px] font-bold text-white">
                                ABA KHQR
                            </span>
                        </div>
                        <dl className="divide-y divide-zinc-100 px-5 dark:divide-zinc-800">
                            {(
                                [
                                    [tr(lang, 'receiptAmount'),
                                        receipt.amount
                                            ? `${receipt.currency === 'KHR' ? '៛' : '$'}${receipt.amount}`
                                            : formatPrice(grandTotal)],
                                    [tr(lang, 'receiptTxn'), receipt.tranId],
                                    [tr(lang, 'receiptApproval'), receipt.apv],
                                    [tr(lang, 'receiptPayer'), receipt.payer],
                                    [tr(lang, 'receiptDate'), receipt.date],
                                ] as [string, string][]
                            )
                                .filter(([, v]) => v)
                                .map(([label, value]) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between gap-4 py-2.5 text-sm"
                                    >
                                        <dt className="text-zinc-500 dark:text-zinc-400">
                                            {label}
                                        </dt>
                                        <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                        </dl>
                    </div>
                )}
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

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        if (!name.trim()) return setError(tr(lang, 'nameRequired'));
        if (!phone.trim()) return setError(tr(lang, 'phoneRequired'));
        if (needsAddress && !address.trim())
            return setError(tr(lang, 'addressRequired'));
        if (isPickup && !branchId) return setError(tr(lang, 'branchRequired'));
        // Live ABA KHQR: the QR appears after the order is placed (real API).
        const useLiveKhqr = usesKhqr;

        setSubmitting(true);
        try {
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
                paymentMethod: usesKhqr
                    ? 'khqr'
                    : isPickup
                      ? 'on_pickup'
                      : 'cod',
                paymentMethodName: usesKhqr
                    ? 'ABA KHQR'
                    : isPickup
                      ? tr(lang, 'payAtStore')
                      : tr(lang, 'payOnDelivery'),
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
            const orderId = json.data?.id ?? '';
            const orderNumber = json.data?.orderNumber ?? orderId;

            // ABA KHQR: get the signed checkout params, then open ABA's own
            // checkout modal (their checkout2-0.js bridge) and poll for payment.
            if (useLiveKhqr && orderId) {
                const qr = await fetch(`${API_URL}/api/payments/aba/checkout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId }),
                });
                if (qr.ok) {
                    const qd = (await qr.json()) as {
                        data?: {
                            actionUrl: string;
                            fields: Record<string, string>;
                        };
                    };
                    if (qd.data?.actionUrl && qd.data.fields?.tran_id) {
                        await waitForAba();
                        const opened = openAbaCheckout(
                            qd.data.actionUrl,
                            qd.data.fields,
                        );
                        if (opened) {
                            setAbaPay({
                                tranId: qd.data.fields.tran_id,
                                orderNumber,
                            });
                            return;
                        }
                    }
                }
                // Payment couldn't be started — this is a pay-first (KHQR) order,
                // so it is NOT placed. Keep the cart, show an error, and let the
                // unpaid order auto-expire and release its reserved stock.
                setError(tr(lang, 'abaPayFailed'));
                return;
            }

            clear();
            setPlaced(orderNumber);
        } catch {
            setError(tr(lang, 'orderFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none transition-colors focus:border-(--brand) dark:border-zinc-700 dark:bg-zinc-900';

    return (
        <div className="relative min-h-screen">
            {/* Subtle premium background gradient */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-zinc-50 via-zinc-100/50 to-zinc-50 dark:from-zinc-950 dark:via-zinc-900/50 dark:to-zinc-950" />
            
            <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
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
                        {payOnDeliveryOnly ? (
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                                <Banknote className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                <p className="text-sm text-zinc-700 dark:text-zinc-200">
                                    {isPickup
                                        ? tr(lang, 'payAtStoreHelp')
                                        : tr(lang, 'payOnDeliveryHelp')}
                                </p>
                            </div>
                        ) : payMethods.length === 0 ? (
                            <p className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-300">
                                {tr(lang, 'noPayMethod')}
                            </p>
                        ) : (
                            <div className="space-y-2.5">
                                {payMethods.map((pm) => {
                                    const active = selectedPay?.id === pm.id;
                                    return (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => setPayMethodId(pm.id)}
                                            style={{
                                                borderColor: active
                                                    ? pm.color
                                                    : `${pm.color}59`,
                                                backgroundColor: active
                                                    ? `${pm.color}12`
                                                    : undefined,
                                                boxShadow: active
                                                    ? `0 0 0 1px ${pm.color}`
                                                    : undefined,
                                            }}
                                            className="relative flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-all hover:opacity-95"
                                        >
                                            <span
                                                style={
                                                    pm.iconUrl
                                                        ? undefined
                                                        : { backgroundColor: pm.color }
                                                }
                                                className={`flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl ${
                                                    pm.iconUrl
                                                        ? 'border border-zinc-200 bg-white dark:border-zinc-700'
                                                        : 'text-white'
                                                }`}
                                            >
                                                <PayIcon
                                                    iconUrl={pm.iconUrl}
                                                    Icon={pm.Icon}
                                                />
                                            </span>
                                            <span className="flex flex-1 flex-col">
                                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                    {pm.title}
                                                </span>
                                                <span className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                                                    {pm.desc}
                                                </span>
                                            </span>
                                            <span
                                                style={
                                                    active
                                                        ? {
                                                              backgroundColor: pm.color,
                                                              borderColor: pm.color,
                                                          }
                                                        : undefined
                                                }
                                                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                                                    active
                                                        ? ''
                                                        : 'border-zinc-300 dark:border-zinc-600'
                                                }`}
                                            >
                                                {active && (
                                                    <Check className="size-3.5 text-white" />
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
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
                    <div className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-zinc-700/50 dark:bg-zinc-900/70">
                        <h2 className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
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
                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-(--brand) px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90 disabled:opacity-60"
                        >
                            {submitting && <Loader2 className="size-4 animate-spin" />}
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

            {/* ABA renders its own checkout modal (via its JS bridge). We only
                show a small, non-blocking pill so the customer can stop waiting
                if they close ABA without paying. It never covers ABA's modal. */}
            {abaPay && (
                <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
                    <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-white/95 px-4 py-2 text-sm shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
                        <Loader2 className="size-4 animate-spin text-[#00529C]" />
                        <span className="text-zinc-600 dark:text-zinc-300">
                            {tr(lang, 'abaWaiting')}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAbaPay(null)}
                            className="text-xs font-medium text-zinc-400 underline-offset-2 hover:text-zinc-600 hover:underline dark:hover:text-zinc-300"
                        >
                            {tr(lang, 'cancel')}
                        </button>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
}

/** Payment-method icon: the uploaded logo, falling back to a default icon if
 *  the image is missing or fails to load. */
function PayIcon({
    iconUrl,
    Icon,
}: {
    iconUrl: string | null;
    Icon: typeof QrCode;
}) {
    const [failed, setFailed] = useState(false);
    if (iconUrl && !failed) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={iconUrl}
                alt=""
                className="size-full object-contain p-1"
                onError={() => setFailed(true)}
            />
        );
    }
    return <Icon className="size-6" />;
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
        <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/50">
            <h2 className="mb-5 flex items-center gap-3 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                <span className="flex size-7 items-center justify-center rounded-full bg-(--brand) text-sm font-bold text-white shadow-sm shadow-(--brand)/30">
                    {step}
                </span>
                {title}
            </h2>
            {children}
        </div>
    );
}
