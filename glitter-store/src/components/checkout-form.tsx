'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { pick, tr, type Lang } from '@/lib/locale';
import type { StoreDelivery } from '@/lib/store-config';
import type { Branch } from '@/lib/types';

const API_URL =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

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

    const shipping =
        delivery.freeOver > 0 && subtotal >= delivery.freeOver
            ? 0
            : delivery.fee;
    const grandTotal = subtotal + shipping;
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');

    // Prefill from the logged-in customer's profile (only if fields are blank).
    useEffect(() => {
        if (user) {
            setName((n) => n || user.fullName || '');
            setPhone((p) => p || user.phoneNumber || '');
        }
    }, [user]);
    const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [placed, setPlaced] = useState<string | null>(null);

    if (!hydrated) {
        return <div className="mx-auto max-w-5xl px-4 py-16" />;
    }

    if (placed !== null) {
        return (
            <div className="mx-auto max-w-xl px-4 py-20 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <svg
                        className="size-7"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M20 6 9 17l-5-5" />
                    </svg>
                </div>
                <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'orderPlaced')}
                </h1>
                {placed && (
                    <p className="mt-2 font-mono text-sm text-zinc-500 dark:text-zinc-400">
                        {tr(lang, 'orderNumber')} #{placed}
                    </p>
                )}
                <p className="mt-2 text-zinc-600 dark:text-zinc-300">
                    {tr(lang, 'orderPlacedHelp')}
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

    if (items.length === 0) {
        return (
            <div className="mx-auto max-w-5xl px-4 py-20 text-center">
                <p className="text-zinc-600 dark:text-zinc-300">{tr(lang, 'cartEmpty')}</p>
                <Link
                    href="/products"
                    className="mt-6 inline-flex rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
                >
                    {tr(lang, 'continueShopping')}
                </Link>
            </div>
        );
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return setError(tr(lang, 'nameRequired'));
        if (!phone.trim()) return setError(tr(lang, 'phoneRequired'));
        if (!branchId) return setError(tr(lang, 'branchRequired'));

        setSubmitting(true);
        setError('');
        try {
            const body = JSON.stringify({
                branchId,
                customerName: name.trim(),
                customerPhone: phone.trim(),
                shippingCost: shipping > 0 ? shipping : undefined,
                note: note.trim() || undefined,
                items: items.map((i) => ({
                    productVariantId: i.variantId,
                    quantity: i.quantity,
                })),
            });
            // Logged-in customers post to the authenticated endpoint so the
            // order is tied to their account (shows up in order history).
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
            const order = json.data;
            clear();
            setPlaced(order?.orderNumber ?? order?.id ?? '');
        } catch {
            setError(tr(lang, 'orderFailed'));
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        'h-11 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-sm outline-none focus:border-(--brand)';

    return (
        <div className="mx-auto max-w-5xl px-4 py-10">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'checkout')}
            </h1>

            <form
                onSubmit={submit}
                className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]"
            >
                {/* Details */}
                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'yourDetails')}
                    </h2>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {tr(lang, 'fullName')}
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {tr(lang, 'phone')}
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {tr(lang, 'pickupBranch')}
                        </label>
                        <select
                            value={branchId}
                            onChange={(e) => setBranchId(e.target.value)}
                            className={inputClass}
                        >
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {pick(lang, b.branchNameEn, b.branchNameKm)}
                                    {b.city ? ` — ${b.city}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                            {tr(lang, 'orderNote')}
                        </label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 p-3 text-sm outline-none focus:border-(--brand)"
                        />
                    </div>
                </div>

                {/* Summary */}
                <div className="h-fit rounded-xl border border-zinc-200 dark:border-zinc-700 p-5">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'orderSummary')}
                    </h2>
                    <ul className="mt-3 space-y-2">
                        {items.map((item) => (
                            <li
                                key={item.variantId}
                                className="flex justify-between gap-3 text-sm"
                            >
                                <span className="min-w-0 truncate text-zinc-600 dark:text-zinc-300">
                                    {pick(lang, item.nameEn, item.nameKm)} ×{' '}
                                    {item.quantity}
                                </span>
                                <span className="shrink-0 font-medium text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(item.unitPrice * item.quantity)}
                                </span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 space-y-1.5 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-300">
                                {tr(lang, 'subtotal')}
                            </span>
                            <span className="text-zinc-900 dark:text-zinc-100">
                                {formatPrice(subtotal)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-300">
                                {tr(lang, 'delivery')}
                            </span>
                            <span
                                className={
                                    shipping === 0
                                        ? 'font-medium text-emerald-600'
                                        : 'text-zinc-900 dark:text-zinc-100'
                                }
                            >
                                {shipping === 0
                                    ? tr(lang, 'free')
                                    : formatPrice(shipping)}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-2">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {tr(lang, 'total')}
                            </span>
                            <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {formatPrice(grandTotal)}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <p className="mt-3 text-sm text-red-600">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="mt-5 flex w-full items-center justify-center rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                        {submitting ? '…' : tr(lang, 'placeOrder')}
                    </button>
                </div>
            </form>
        </div>
    );
}
