'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    BadgeCheck,
    CalendarDays,
    Camera,
    ChevronRight,
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
import { ProfileEditSheet } from '@/components/auth/profile-edit-sheet';
import { AddressForm } from '@/components/checkout/address-form';
import { PromoOffers } from '@/components/promo-offers';
import { StatCard } from '@/components/account/stat-card';
import { MenuRow } from '@/components/account/menu-row';
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
import { ORDER_STATUS_STYLE, orderStatusLabel } from '@/lib/order-ui';
import { formatPrice, getMyVouchers, type PublicPromo } from '@/lib/api';
import { useLang } from '@/lib/lang-context';
import { tr, type Lang } from '@/lib/locale';
import type { Address } from '@/lib/types';
import { onLiveChange } from '@/lib/realtime';

const HAS_GOOGLE = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

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
    const [ordersLoading, setOrdersLoading] = useState(true);
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
        if (user)
            getMyVouchers(authFetch)
                .then(setCoupons)
                .catch(() => {});
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
        const off = onLiveChange(['orders'], () => loadOrders());
        return () => {
            active = false;
            off();
        };
    }, [user, authFetch]);

    if (loading || !user) {
        return <AccountSkeleton />;
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
        // Telegram sign-in is disabled for now.
    ];
    // Compact inline "Connect" control for an unlinked provider row.
    function connectButton(provider: AuthProvider) {
        if (provider !== 'google') return null;
        return (
            <GoogleSignInButton
                lang={lang}
                compact
                mode="link"
                onError={setConnectError}
            />
        );
    }

    const dateLocale = lang === 'km' ? 'km-KH' : 'en-US';
    const recentOrders = orders.slice(0, 3);
    const firstName = (user.fullName || '').trim().split(/\s+/)[0];

    return (
        <div className="stagger mx-auto max-w-5xl px-4 pb-10 pt-4 md:pt-8">
            <BackLink
                lang={lang}
                fallbackHref="/"
                className="mb-4 max-md:hidden"
            />

            <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-6">
                {/* ── Left: profile card (sticky on desktop) ───────────── */}
                <aside className="space-y-4 lg:sticky lg:top-24">
                    <div className="overflow-hidden rounded-3xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                        {/* Brand banner */}
                        <div className="relative h-24 bg-linear-to-br from-(--brand) to-(--brand)/60">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
                        </div>
                        <div className="-mt-12 px-5 pb-5 text-center">
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
                                <span className="absolute bottom-0.5 right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-white bg-(--brand) text-white shadow dark:border-zinc-900">
                                    <Camera className="size-3.5" />
                                </span>
                            </button>

                            <h1 className="mt-3 flex items-center justify-center gap-1.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                <span className="truncate">
                                    {user.fullName || tr(lang, 'account')}
                                </span>
                                {verified && (
                                    <BadgeCheck
                                        className="size-5 shrink-0 text-(--brand)"
                                        aria-label={tr(lang, 'accountVerified')}
                                    />
                                )}
                            </h1>
                            {user.email && (
                                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                                    {user.email}
                                </p>
                            )}

                            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                                {user.phoneNumber && (
                                    <Chip
                                        icon={Phone}
                                        text={user.phoneNumber}
                                    />
                                )}
                                {user.createdAt && (
                                    <Chip
                                        icon={CalendarDays}
                                        text={`${tr(lang, 'memberSince')} ${new Date(
                                            user.createdAt,
                                        ).toLocaleDateString(dateLocale, {
                                            month: 'short',
                                            year: 'numeric',
                                        })}`}
                                    />
                                )}
                                {!verified && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                                        <BadgeCheck className="size-3.5" />
                                        {tr(lang, 'notVerified')}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setEditOpen(true)}
                                className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 transition hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                            >
                                <Pencil className="size-4" />
                                {tr(lang, 'editProfile')}
                            </button>
                        </div>
                    </div>

                    {/* Log out — desktop sits under the profile card */}
                    <LogoutButton
                        lang={lang}
                        className="max-lg:hidden"
                        onClick={() =>
                            void logout().then(() => router.push('/'))
                        }
                    />
                </aside>

                {/* ── Right: activity + settings ───────────────────────── */}
                <main className="mt-5 min-w-0 space-y-6 lg:mt-0">
                    {firstName && (
                        <p className="text-xl font-bold tracking-tight text-zinc-900 max-lg:hidden dark:text-zinc-100">
                            {tr(lang, 'hiName').replace('{name}', firstName)} 👋
                        </p>
                    )}

                    {/* Verify-email prompt — only when there's an email that isn't verified */}
                    {user.email && !user.emailVerifiedAt && (
                        <button
                            type="button"
                            onClick={() => setEmailVerifyOpen(true)}
                            className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-500/10 dark:hover:bg-amber-500/15"
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
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        <Link href="/account/orders">
                            <StatCard
                                icon={ShoppingBag}
                                label={tr(lang, 'totalOrders')}
                                value={compactCount(orders.length)}
                                full={String(orders.length)}
                                interactive
                            />
                        </Link>
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

                    {/* Recent orders */}
                    <Card
                        title={tr(lang, 'recentOrders')}
                        action={
                            orders.length > 0 ? (
                                <Link
                                    href="/account/orders"
                                    className="inline-flex items-center gap-0.5 text-xs font-semibold text-(--brand) hover:underline"
                                >
                                    {tr(lang, 'viewAll')}
                                    <ChevronRight className="size-3.5" />
                                </Link>
                            ) : undefined
                        }
                    >
                        {ordersLoading ? (
                            <div className="space-y-3 p-5">
                                {[0, 1].map((i) => (
                                    <div
                                        key={i}
                                        className="h-12 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                                    />
                                ))}
                            </div>
                        ) : recentOrders.length === 0 ? (
                            <div className="flex flex-col items-center px-5 py-8 text-center">
                                <span className="flex size-12 items-center justify-center rounded-2xl bg-(--brand)/10 text-(--brand)">
                                    <Package className="size-6" />
                                </span>
                                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {tr(lang, 'noOrders')}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'noOrdersHint')}
                                </p>
                                <Link
                                    href="/"
                                    className="mt-4 rounded-xl bg-(--brand) px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition hover:opacity-95"
                                >
                                    {tr(lang, 'continueShopping')}
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {recentOrders.map((o) => (
                                    <Link
                                        key={o.id}
                                        href={`/account/orders/${o.id}`}
                                        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                    >
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                            <Package className="size-5" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {o.orderNumber}
                                            </span>
                                            <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                                {new Date(
                                                    o.createdAt,
                                                ).toLocaleDateString(
                                                    dateLocale,
                                                    {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    },
                                                )}
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 flex-col items-end gap-1">
                                            <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                                                {formatPrice(o.grandTotal)}
                                            </span>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                                    ORDER_STATUS_STYLE[
                                                        o.status
                                                    ] ??
                                                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                                                }`}
                                            >
                                                {orderStatusLabel(
                                                    lang,
                                                    o.status,
                                                )}
                                            </span>
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* My coupons — codes this customer is eligible for */}
                    <div className="[&>section]:mt-0 empty:hidden">
                        <PromoOffers
                            promos={coupons}
                            lang={lang}
                            title={tr(lang, 'myCoupons')}
                            subtitle={tr(lang, 'myCouponsSub')}
                        />
                    </div>

                    {/* Saved addresses */}
                    <Card
                        title={tr(lang, 'savedAddresses')}
                        action={
                            <button
                                type="button"
                                onClick={() => setAddrModal({ editing: null })}
                                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:text-zinc-200"
                            >
                                <Plus className="size-3.5" />
                                {tr(lang, 'addAddress')}
                            </button>
                        }
                    >
                        {addresses.length === 0 ? (
                            <button
                                type="button"
                                onClick={() => setAddrModal({ editing: null })}
                                className="m-4 flex w-[calc(100%-2rem)] flex-col items-center rounded-2xl border-2 border-dashed border-zinc-200 px-5 py-7 text-center transition-colors hover:border-(--brand)/50 dark:border-zinc-700"
                            >
                                <MapPin className="size-6 text-zinc-300 dark:text-zinc-600" />
                                <span className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                    {tr(lang, 'noAddressYet')}
                                </span>
                            </button>
                        ) : (
                            <div className="grid gap-3 p-4 sm:grid-cols-2">
                                {addresses.map((a) => (
                                    <div
                                        key={a.id}
                                        className={`relative rounded-2xl border p-4 ${
                                            a.isDefaultShipping
                                                ? 'border-(--brand)/40 bg-(--brand)/5'
                                                : 'border-zinc-200 dark:border-zinc-700'
                                        }`}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <MapPin className="mt-0.5 size-4 shrink-0 text-(--brand)" />
                                            <div className="min-w-0 flex-1">
                                                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                    <span className="truncate">
                                                        {a.label ||
                                                            a.recipientName}
                                                    </span>
                                                    {a.isDefaultShipping && (
                                                        <span className="rounded-full bg-(--brand) px-2 py-0.5 text-[10px] font-bold text-white">
                                                            {tr(
                                                                lang,
                                                                'defaultAddress',
                                                            )}
                                                        </span>
                                                    )}
                                                </p>
                                                {a.label && (
                                                    <p className="truncate text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                                        {a.recipientName}
                                                    </p>
                                                )}
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    {a.recipientPhone}
                                                </p>
                                                <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                    {[
                                                        a.streetAddress,
                                                        a.landmark,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' — ')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-end gap-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAddrModal({ editing: a })
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-100 hover:text-(--brand) dark:hover:bg-zinc-800"
                                            >
                                                <Pencil className="size-3.5" />
                                                {tr(lang, 'edit')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    deleteAddress(a.id)
                                                }
                                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                            >
                                                <Trash2 className="size-3.5" />
                                                {tr(lang, 'delete')}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Sign-in & security: password + connected accounts */}
                    <div>
                        {connectError && (
                            <p className="mb-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-400">
                                {connectError}
                            </p>
                        )}
                        <Card
                            title={tr(lang, 'accountSecurity')}
                            note={tr(lang, 'connectHint')}
                        >
                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {hasPassword && (
                                    <MenuRow
                                        icon={KeyRound}
                                        title={tr(lang, 'changePassword')}
                                        onClick={() => setPwOpen(true)}
                                    />
                                )}
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
                                                        ? () =>
                                                              disconnect(
                                                                  c.provider,
                                                              )
                                                        : undefined
                                                }
                                                connectSlot={
                                                    isLinked
                                                        ? undefined
                                                        : connectButton(
                                                              c.provider,
                                                          )
                                                }
                                            />
                                        );
                                    })}
                            </div>
                        </Card>
                    </div>

                    {/* Language + dark mode — mobile only; on desktop the web header
                        already provides these toggles (avoid duplicating them). */}
                    <div className="md:hidden">
                        <AppearanceSettings lang={lang} />
                    </div>

                    <LogoutButton
                        lang={lang}
                        className="lg:hidden"
                        onClick={() =>
                            void logout().then(() => router.push('/'))
                        }
                    />
                </main>
            </div>

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
                        void logout().then(() => router.push('/account/login'));
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

/** A titled content card with an optional header action. */
function Card({
    title,
    note,
    action,
    children,
}: {
    title: string;
    note?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <div className="min-w-0">
                    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h2>
                    {note && (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {note}
                        </p>
                    )}
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function LogoutButton({
    lang,
    className = '',
    onClick,
}: {
    lang: Lang;
    className?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200/80 bg-white py-3 text-sm font-semibold text-red-600 shadow-sm transition-all hover:border-red-500 hover:bg-red-500 hover:text-white active:scale-[0.98] dark:border-red-500/30 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white ${className}`}
        >
            <LogOut className="size-4 transition-transform group-hover:-translate-x-0.5" />
            {tr(lang, 'logout')}
        </button>
    );
}

/** Loading placeholder mirroring the two-column layout. */
function AccountSkeleton() {
    const block =
        'rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900';
    return (
        <div className="mx-auto max-w-5xl animate-pulse px-4 pb-10 pt-4 md:pt-8">
            <div className="mb-4 h-4 w-16 rounded bg-zinc-200 max-md:hidden dark:bg-zinc-800" />
            <div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
                <div className={`${block} overflow-hidden rounded-3xl`}>
                    <div className="h-24 bg-zinc-200 dark:bg-zinc-800" />
                    <div className="-mt-12 flex flex-col items-center gap-3 px-5 pb-5">
                        <div className="size-24 rounded-full bg-zinc-200 ring-4 ring-white dark:bg-zinc-700 dark:ring-zinc-900" />
                        <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="mt-2 h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800" />
                    </div>
                </div>
                <div className="mt-5 space-y-6 lg:mt-0">
                    <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`${block} h-28`} />
                        ))}
                    </div>
                    <div className={`${block} h-56`} />
                    <div className={`${block} h-40`} />
                </div>
            </div>
        </div>
    );
}
