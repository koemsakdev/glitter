'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    BadgeCheck,
    CalendarDays,
    Camera,
    Heart,
    KeyRound,
    LogOut,
    Mail,
    MapPin,
    Package,
    Pencil,
    Phone,
    Plus,
    ShoppingBag,
    Trash2,
    Wallet,
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { BackLink } from '@/components/ui/back-link';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { FacebookLoginButton } from '@/components/auth/facebook-login-button';
import { TelegramLoginButton } from '@/components/auth/telegram-login-button';
import { ProfileEditSheet } from '@/components/auth/profile-edit-sheet';
import { AddressForm } from '@/components/checkout/address-form';
import { PromoOffers } from '@/components/promo-offers';
import { StatCard } from '@/components/account/stat-card';
import { MenuRow } from '@/components/account/menu-row';
import { SectionCard } from '@/components/account/section-card';
import { Chip } from '@/components/account/chip';
import { ProviderStatusRow } from '@/components/account/provider-status-row';
import { ChangePasswordModal } from '@/components/account/change-password-modal';
import { AppearanceSettings } from '@/components/account/appearance-settings';
import { EmailVerifyModal } from '@/components/account/email-verify-modal';
import {
    providerName,
    compactMoney,
    compactCount,
} from '@/components/account/account-format';
import { useAuth, type AuthProvider } from '@/lib/auth';
import { useWishlist } from '@/lib/wishlist';
import { formatPrice, getMyVouchers, type PublicPromo } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import type { Address } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';
const HAS_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
const HAS_FACEBOOK = Boolean(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID);
const HAS_TELEGRAM = Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);

interface OrderRow {
    id: string;
    orderNumber: string;
    status: string;
    grandTotal: number;
    createdAt: string;
    itemCount?: number;
}

export function AccountView({ lang: initialLang }: { lang: Lang }) {
    const { lang } = useLang(initialLang);
    const router = useRouter();
    const { user, loading, logout, authFetch, refreshUser } = useAuth();
    const { products: wishlist } = useWishlist();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [, setOrdersLoading] = useState(true);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [coupons, setCoupons] = useState<PublicPromo[]>([]);
    const [editOpen, setEditOpen] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);
    const [emailVerifyOpen, setEmailVerifyOpen] = useState(false);
    const [connectError, setConnectError] = useState('');
    const [addrModal, setAddrModal] = useState<{
        editing: Address | null;
    } | null>(null);

    const loadAddresses = useCallback(async () => {
        try {
            const r = await authFetch('/api/account/addresses');
            if (!r.ok) return;
            const d = (await r.json()) as { data?: Address[] };
            setAddresses(d.data ?? []);
        } catch {
            // ignore
        }
    }, [authFetch]);

    useEffect(() => {
        if (user) void loadAddresses();
    }, [user, loadAddresses]);

    useEffect(() => {
        if (user) getMyVouchers(authFetch).then(setCoupons).catch(() => {});
    }, [user, authFetch]);

    async function deleteAddress(id: string) {
        try {
            await authFetch(`/api/account/addresses/${id}`, {
                method: 'DELETE',
            });
        } catch {
            // ignore
        }
        void loadAddresses();
    }

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    useEffect(() => {
        if (!user) return;
        let active = true;

        function loadOrders() {
            authFetch('/api/account/orders')
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((d: { data?: OrderRow[] }) => {
                    if (active) setOrders(d.data ?? []);
                })
                .catch(() => {})
                .finally(() => {
                    if (active) setOrdersLoading(false);
                });
        }

        loadOrders();
        const source = new EventSource(`${API_URL}/api/realtime/events`);
        source.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as { entity?: string };
                if (data.entity === 'orders') loadOrders();
            } catch {
                // ignore malformed events
            }
        };
        return () => {
            active = false;
            source.close();
        };
    }, [user, authFetch]);

    if (loading || !user) {
        return (
            <div className="mx-auto max-w-2xl animate-pulse px-4 py-8">
                <div className="mb-4 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col items-center gap-3">
                        <div className="size-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-24 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    ))}
                </div>
                <div className="mt-6 h-56 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
        );
    }

    const verified = !!(user.emailVerifiedAt || user.phoneVerifiedAt);
    const totalSpent = orders
        .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
        .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    const linked = (p: AuthProvider) =>
        (user.linkedProviders ?? []).includes(p);
    const hasPassword = linked('email');
    // Keep at least one sign-in method — only offer Disconnect when 2+ exist.
    const linkedCount = (user.linkedProviders ?? []).length;
    async function disconnect(provider: AuthProvider) {
        try {
            const r = await authFetch(`/api/auth/providers/${provider}`, {
                method: 'DELETE',
            });
            if (r.ok) await refreshUser();
        } catch {
            // ignore — the button is hidden when it would fail
        }
    }
    const connectable: { provider: AuthProvider; available: boolean }[] = [
        { provider: 'google', available: HAS_GOOGLE },
        { provider: 'facebook', available: HAS_FACEBOOK },
        { provider: 'telegram', available: HAS_TELEGRAM },
    ];
    // Compact inline "Connect" control for an unlinked provider row.
    function connectButton(provider: AuthProvider) {
        if (provider === 'google')
            return (
                <GoogleSignInButton
                    lang={lang}
                    compact
                    mode="link"
                    onError={setConnectError}
                />
            );
        if (provider === 'facebook')
            return (
                <FacebookLoginButton
                    lang={lang}
                    compact
                    mode="link"
                    onError={setConnectError}
                />
            );
        return (
            <TelegramLoginButton compact mode="link" onError={setConnectError} />
        );
    }

    return (
        <div className="stagger mx-auto max-w-2xl px-4 pb-8 pt-4 md:pt-8">
            <BackLink lang={lang} fallbackHref="/" className="mb-4 max-md:hidden" />

            {/* Profile header — centred, app style */}
            <div className="relative overflow-hidden rounded-3xl border border-zinc-100 bg-white pb-6 pt-9 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-linear-to-b from-(--brand)/12 to-transparent" />
                <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="group relative mx-auto block w-fit"
                    aria-label={tr(lang, 'changePhoto')}
                >
                    <UserAvatar
                        src={user.profileImageUrl}
                        name={user.fullName}
                        className="size-24 rounded-full text-3xl shadow-lg ring-4 ring-white dark:ring-zinc-900"
                    />
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="size-6 text-white" />
                    </span>
                    <span className="absolute bottom-0.5 right-0.5 flex size-8 items-center justify-center rounded-full border-2 border-white bg-(--brand) text-white shadow dark:border-zinc-900">
                        <Camera className="size-4" />
                    </span>
                </button>
                <h1 className="mt-3 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {user.fullName || tr(lang, 'account')}
                </h1>
                {user.email && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {user.email}
                    </p>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2 px-6">
                    {user.phoneNumber && (
                        <Chip icon={Phone} text={user.phoneNumber} />
                    )}
                    {user.createdAt && (
                        <Chip
                            icon={CalendarDays}
                            text={`${tr(lang, 'memberSince')} ${new Date(
                                user.createdAt,
                            ).toLocaleDateString(
                                lang === 'km' ? 'km-KH' : 'en-US',
                                { month: 'short', year: 'numeric' },
                            )}`}
                        />
                    )}
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                            verified
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                        }`}
                    >
                        <BadgeCheck className="size-3.5" />
                        {tr(lang, verified ? 'accountVerified' : 'notVerified')}
                    </span>
                </div>
            </div>

            {/* Verify-email prompt — only when there's an email that isn't verified */}
            {user.email && !user.emailVerifiedAt && (
                <button
                    type="button"
                    onClick={() => setEmailVerifyOpen(true)}
                    className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        <Mail className="size-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-amber-800 dark:text-amber-300">
                            {tr(lang, 'emailNotVerified')}
                        </span>
                        <span className="block truncate text-xs text-amber-600/90 dark:text-amber-400/80">
                            {user.email}
                        </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-(--brand) px-3 py-1.5 text-xs font-bold text-white">
                        {tr(lang, 'verifyNow')}
                    </span>
                </button>
            )}

            {/* Stats */}
            <div className="mt-5 grid grid-cols-3 gap-2.5 sm:gap-3">
                <StatCard
                    icon={ShoppingBag}
                    label={tr(lang, 'totalOrders')}
                    value={compactCount(orders.length)}
                    full={String(orders.length)}
                />
                <StatCard
                    icon={Wallet}
                    label={tr(lang, 'totalSpent')}
                    value={compactMoney(totalSpent)}
                    full={formatPrice(totalSpent)}
                />
                <Link href="/account/wishlist">
                    <StatCard
                        icon={Heart}
                        label={tr(lang, 'savedItems')}
                        value={compactCount(wishlist.length)}
                        full={String(wishlist.length)}
                        interactive
                    />
                </Link>
            </div>

            {/* Account actions — settings list */}
            <h2 className="mb-2 mt-6 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'manageAccount')}
            </h2>
            <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                <MenuRow
                    icon={Pencil}
                    title={tr(lang, 'editProfile')}
                    onClick={() => setEditOpen(true)}
                />
                <MenuRow
                    icon={Package}
                    title={tr(lang, 'myOrders')}
                    subtitle={
                        orders.length
                            ? `${orders.length} ${tr(lang, 'totalOrders').toLowerCase()}`
                            : undefined
                    }
                    href="/account/orders"
                />
                <MenuRow
                    icon={Heart}
                    title={tr(lang, 'myWishlist')}
                    subtitle={
                        wishlist.length
                            ? `${wishlist.length} ${tr(lang, 'savedItems').toLowerCase()}`
                            : undefined
                    }
                    href="/account/wishlist"
                />
                {hasPassword && (
                    <MenuRow
                        icon={KeyRound}
                        title={tr(lang, 'changePassword')}
                        onClick={() => setPwOpen(true)}
                    />
                )}
            </div>

            {/* Language + dark mode — mobile only; on desktop the web header
                already provides these toggles (avoid duplicating them). */}
            <div className="md:hidden">
                <AppearanceSettings lang={lang} />
            </div>

            {/* My coupons — codes this customer is eligible for */}
            <PromoOffers
                promos={coupons}
                lang={lang}
                title={tr(lang, 'myCoupons')}
                subtitle={tr(lang, 'myCouponsSub')}
            />

            {/* Saved addresses */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'savedAddresses')}
                    </p>
                    <button
                        type="button"
                        onClick={() => setAddrModal({ editing: null })}
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                    >
                        <Plus className="size-3.5" />
                        {tr(lang, 'addAddress')}
                    </button>
                </div>
                {addresses.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-zinc-400">
                        {tr(lang, 'noAddressYet')}
                    </p>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {addresses.map((a) => (
                            <div
                                key={a.id}
                                className="flex items-start gap-3 px-5 py-3.5"
                            >
                                <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        {a.label ? `${a.label} · ` : ''}
                                        {a.recipientName}
                                        {a.isDefaultShipping && (
                                            <span className="ml-2 rounded-full bg-(--brand)/10 px-2 py-0.5 text-[10px] font-bold text-(--brand)">
                                                ★
                                            </span>
                                        )}
                                    </p>
                                    <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                        {a.recipientPhone} ·{' '}
                                        {[a.streetAddress, a.landmark]
                                            .filter(Boolean)
                                            .join(' — ')}
                                    </p>
                                </div>
                                <div className="flex shrink-0 gap-0.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAddrModal({ editing: a })
                                        }
                                        aria-label={tr(lang, 'edit')}
                                        className="rounded-lg p-1.5 text-zinc-400 hover:text-(--brand)"
                                    >
                                        <Pencil className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteAddress(a.id)}
                                        aria-label={tr(lang, 'delete')}
                                        className="rounded-lg p-1.5 text-zinc-400 hover:text-red-600"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Connected accounts — each row shows Connect (if not linked) or a
                Connected badge + Disconnect (if linked). */}
            {connectError && (
                <p className="mt-6 mb-1 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {connectError}
                </p>
            )}
            <SectionCard
                title={tr(lang, 'connectedAccounts')}
                note={tr(lang, 'connectHint')}
            >
                <ProviderStatusRow
                    provider="email"
                    label={tr(lang, 'providerEmail')}
                    connected={linked('email')}
                    lang={lang}
                />
                {connectable
                    .filter((c) => c.available)
                    .map((c) => {
                        const isLinked = linked(c.provider);
                        return (
                            <ProviderStatusRow
                                key={c.provider}
                                provider={c.provider}
                                label={providerName(c.provider)}
                                connected={isLinked}
                                lang={lang}
                                onDisconnect={
                                    isLinked && linkedCount > 1
                                        ? () => disconnect(c.provider)
                                        : undefined
                                }
                                connectSlot={
                                    isLinked
                                        ? undefined
                                        : connectButton(c.provider)
                                }
                            />
                        );
                    })}
            </SectionCard>

            {/* Log out — outlined red pill that fills on hover, with a subtle
                "exit" nudge on the icon. */}
            <button
                type="button"
                onClick={() => {
                    void logout().then(() => router.push('/'));
                }}
                className="group relative mt-6 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-red-200/80 bg-red-50/50 py-3.5 text-sm font-bold text-red-600 shadow-sm transition-all duration-300 hover:border-red-500 hover:bg-red-500 hover:text-white hover:shadow-lg hover:shadow-red-500/30 active:scale-[0.98] dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white"
            >
                {/* soft sheen sweeping across on hover */}
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                <LogOut className="size-4.5 transition-transform duration-300 group-hover:-translate-x-0.5 group-hover:-rotate-12" />
                {tr(lang, 'logout')}
            </button>

            {editOpen && (
                <ProfileEditSheet
                    lang={lang}
                    userId={user.id}
                    initialName={user.fullName ?? ''}
                    initialEmail={user.email ?? ''}
                    initialPhone={user.phoneNumber ?? ''}
                    initialAvatar={user.profileImageUrl}
                    onClose={() => setEditOpen(false)}
                    onSaved={() => refreshUser()}
                />
            )}
            {pwOpen && (
                <ChangePasswordModal
                    lang={lang}
                    authFetch={authFetch}
                    onClose={() => setPwOpen(false)}
                    onChanged={() => {
                        void logout().then(() =>
                            router.push('/account/login'),
                        );
                    }}
                />
            )}
            {user.email && (
                <EmailVerifyModal
                    lang={lang}
                    email={user.email}
                    open={emailVerifyOpen}
                    onClose={() => setEmailVerifyOpen(false)}
                    onVerified={() => {
                        setEmailVerifyOpen(false);
                        void refreshUser();
                    }}
                />
            )}
            {addrModal && (
                <AddressForm
                    lang={lang}
                    defaultName={user.fullName ?? ''}
                    defaultPhone={user.phoneNumber ?? ''}
                    initial={addrModal.editing ?? undefined}
                    onClose={() => setAddrModal(null)}
                    onSaved={() => {
                        setAddrModal(null);
                        void loadAddresses();
                    }}
                />
            )}
        </div>
    );
}
