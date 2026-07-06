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
    Loader2,
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
    X,
} from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { BackLink } from '@/components/ui/back-link';
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button';
import { FacebookLoginButton } from '@/components/auth/facebook-login-button';
import { TelegramLoginButton } from '@/components/auth/telegram-login-button';
import { ProfileEditSheet } from '@/components/auth/profile-edit-sheet';
import { AddressForm } from '@/components/checkout/address-form';
import { PromoOffers } from '@/components/promo-offers';
import { useAuth, type AuthProvider } from '@/lib/auth';
import { useWishlist } from '@/lib/wishlist';
import { formatPrice, getMyVouchers, type PublicPromo } from '@/lib/api';
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

export function AccountView({ lang }: { lang: Lang }) {
    const router = useRouter();
    const { user, loading, logout, authFetch, refreshUser } = useAuth();
    const { products: wishlist } = useWishlist();
    const [orders, setOrders] = useState<OrderRow[]>([]);
    const [, setOrdersLoading] = useState(true);
    const [addresses, setAddresses] = useState<Address[]>([]);
    const [coupons, setCoupons] = useState<PublicPromo[]>([]);
    const [editOpen, setEditOpen] = useState(false);
    const [pwOpen, setPwOpen] = useState(false);
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
            <div className="mx-auto max-w-4xl animate-pulse px-4 py-10">
                <div className="mb-4 h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="rounded-3xl border border-zinc-100 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center gap-4">
                        <div className="size-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
                        <div className="space-y-2">
                            <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-4 w-56 rounded bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                    </div>
                    <div className="mt-5 flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                        <div className="h-6 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-6 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-28 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    ))}
                </div>
                <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                            key={i}
                            className="h-24 rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    ))}
                </div>
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
    const connectable: { provider: AuthProvider; available: boolean }[] = [
        { provider: 'google', available: HAS_GOOGLE },
        { provider: 'facebook', available: HAS_FACEBOOK },
        { provider: 'telegram', available: HAS_TELEGRAM },
    ];
    const toConnect = connectable.filter(
        (c) => c.available && !linked(c.provider),
    );

    return (
        <div className="stagger mx-auto max-w-4xl px-4 py-10">
            <BackLink lang={lang} fallbackHref="/" className="mb-4" />

            {/* Profile header */}
            <Reveal className="rounded-3xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setEditOpen(true)}
                            className="group relative shrink-0"
                            aria-label={tr(lang, 'changePhoto')}
                        >
                            <UserAvatar
                                src={user.profileImageUrl}
                                name={user.fullName}
                                className="size-16 rounded-2xl text-xl"
                            />
                            <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                                <Camera className="size-5 text-white" />
                            </span>
                            {verified && (
                                <BadgeCheck className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white fill-[#1877f2] text-white dark:bg-zinc-900" />
                            )}
                        </button>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                                {user.fullName || tr(lang, 'account')}
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            void logout().then(() => router.push('/'));
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-red-500/10"
                    >
                        <LogOut className="size-4" />
                        {tr(lang, 'logout')}
                    </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    {user.email && <Chip icon={Mail} text={user.email} />}
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
            </Reveal>

            {/* Stats */}
            <Reveal
                delay={60}
                className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3"
            >
                <StatCard
                    icon={ShoppingBag}
                    label={tr(lang, 'totalOrders')}
                    value={String(orders.length)}
                />
                <StatCard
                    icon={Wallet}
                    label={tr(lang, 'totalSpent')}
                    value={formatPrice(totalSpent)}
                />
                <Link href="/account/wishlist">
                    <StatCard
                        icon={Heart}
                        label={tr(lang, 'savedItems')}
                        value={String(wishlist.length)}
                        interactive
                    />
                </Link>
            </Reveal>

            {/* Account actions */}
            <Reveal delay={120} className="mt-8">
                <h2 className="mb-3 px-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'manageAccount')}
                </h2>
                <div className="grid grid-cols-3 gap-3">
                    <ActionCard
                        icon={Pencil}
                        title={tr(lang, 'editProfile')}
                        onClick={() => setEditOpen(true)}
                    />
                    <ActionCard
                        icon={Package}
                        title={tr(lang, 'myOrders')}
                        href="/account/orders"
                    />
                    <ActionCard
                        icon={Heart}
                        title={tr(lang, 'myWishlist')}
                        href="/account/wishlist"
                    />
                    {hasPassword && (
                        <ActionCard
                            icon={KeyRound}
                            title={tr(lang, 'changePassword')}
                            onClick={() => setPwOpen(true)}
                        />
                    )}
                </div>
            </Reveal>

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

            {/* Connected accounts */}
            <SectionCard
                title={tr(lang, 'connectedAccounts')}
                note={tr(lang, 'connectHint')}
                delay={240}
            >
                <ProviderStatusRow
                    provider="email"
                    label={tr(lang, 'providerEmail')}
                    connected={linked('email')}
                    lang={lang}
                />
                {connectable
                    .filter((c) => c.available)
                    .map((c) => (
                        <ProviderStatusRow
                            key={c.provider}
                            provider={c.provider}
                            label={providerName(c.provider)}
                            connected={linked(c.provider)}
                            lang={lang}
                        />
                    ))}
                {toConnect.length > 0 && (
                    <div className="space-y-2.5 px-5 py-4">
                        {toConnect.some((c) => c.provider === 'google') && (
                            <GoogleSignInButton lang={lang} />
                        )}
                        {toConnect.some((c) => c.provider === 'facebook') && (
                            <FacebookLoginButton lang={lang} />
                        )}
                        {toConnect.some((c) => c.provider === 'telegram') && (
                            <TelegramLoginButton />
                        )}
                    </div>
                )}
            </SectionCard>

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function providerName(p: AuthProvider): string {
    return { google: 'Google', facebook: 'Facebook', telegram: 'Telegram', email: 'Email' }[p];
}

/**
 * Section wrapper. Entrance animation is driven by the parent `.stagger`
 * container (see globals.css), which fades each child up in sequence — so this
 * is just a styled div. `delay` is accepted for call-site clarity but unused.
 */
function Reveal({
    className = '',
    children,
}: {
    delay?: number;
    className?: string;
    children: React.ReactNode;
}) {
    return <div className={className}>{children}</div>;
}

function StatCard({
    icon: Icon,
    label,
    value,
    interactive,
}: {
    icon: typeof ShoppingBag;
    label: string;
    value: string;
    interactive?: boolean;
}) {
    return (
        <div
            className={`group rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-900 ${
                interactive
                    ? 'hover:-translate-y-1 hover:border-(--brand)/40 hover:shadow-lg hover:shadow-(--brand)/5'
                    : ''
            }`}
        >
            <span className="flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-(--brand) to-pink-400 text-white shadow-sm shadow-(--brand)/20 transition-transform duration-200 group-hover:scale-110">
                <Icon className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                {value}
            </p>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
        </div>
    );
}

function ActionCard({
    icon: Icon,
    title,
    href,
    onClick,
}: {
    icon: typeof ShoppingBag;
    title: string;
    href?: string;
    onClick?: () => void;
}) {
    const cls =
        'group flex flex-col items-start gap-3 rounded-2xl border border-zinc-100 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-(--brand)/40 hover:shadow-lg hover:shadow-(--brand)/5 dark:border-zinc-800 dark:bg-zinc-900';
    const inner = (
        <>
            <span className="flex size-11 items-center justify-center rounded-2xl bg-(--brand)/10 text-(--brand) transition-transform duration-200 group-hover:scale-110">
                <Icon className="size-5" />
            </span>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
            </span>
        </>
    );
    return href ? (
        <Link href={href} className={cls}>
            {inner}
        </Link>
    ) : (
        <button type="button" onClick={onClick} className={`${cls} w-full`}>
            {inner}
        </button>
    );
}

function SectionCard({
    title,
    note,
    delay,
    children,
}: {
    title: string;
    note?: string;
    delay?: number;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {title}
                </p>
                {note && (
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {note}
                    </p>
                )}
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {children}
            </div>
        </div>
    );
}

function ProviderStatusRow({
    provider,
    label,
    connected,
    lang,
}: {
    provider: AuthProvider;
    label: string;
    connected: boolean;
    lang: Lang;
}) {
    return (
        <div className="flex items-center gap-3 px-5 py-3.5">
            <span className="flex size-9 items-center justify-center rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <ProviderIcon provider={provider} />
            </span>
            <span className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {label}
            </span>
            {connected ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <BadgeCheck className="size-3.5" />
                    {tr(lang, 'connected')}
                </span>
            ) : (
                <span className="text-xs font-medium text-zinc-400">
                    {tr(lang, 'notConnected')}
                </span>
            )}
        </div>
    );
}

function ProviderIcon({ provider }: { provider: AuthProvider }) {
    if (provider === 'email') return <Mail className="size-4 text-zinc-500" />;
    if (provider === 'facebook')
        return (
            <svg
                className="size-4 text-[#1877F2]"
                viewBox="0 0 24 24"
                fill="currentColor"
            >
                <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
            </svg>
        );
    if (provider === 'telegram')
        return (
            <svg className="size-4 text-[#28A8E9]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.94 2.5A9.5 9.5 0 1 0 21.5 12 9.5 9.5 0 0 0 11.94 2.5zm4.38 6.53-1.46 6.9c-.11.49-.4.61-.81.38l-2.24-1.65-1.08 1.04c-.12.12-.22.22-.45.22l.16-2.28 4.15-3.75c.18-.16-.04-.25-.28-.09L9.2 13.2l-2.2-.69c-.48-.15-.49-.48.1-.71l8.6-3.32c.4-.15.75.09.62.55z" />
            </svg>
        );
    // google
    return (
        <svg className="size-4" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.61 20.08H42V20H24v8h11.3c-1.65 4.66-6.08 8-11.3 8-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.39-3.92z" />
            <path fill="#FF3D00" d="M6.31 14.69l6.57 4.82C14.66 15.11 18.96 12 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66C34.05 6.05 29.27 4 24 4 16.32 4 9.66 8.34 6.31 14.69z" />
            <path fill="#4CAF50" d="M24 44c5.17 0 9.86-1.98 13.41-5.2l-6.19-5.24C29.14 35.09 26.72 36 24 36c-5.2 0-9.62-3.32-11.28-7.95l-6.52 5.02C9.5 39.56 16.23 44 24 44z" />
            <path fill="#1976D2" d="M43.61 20.08H42V20H24v8h11.3c-.79 2.24-2.23 4.16-4.09 5.56l6.19 5.24C39.9 36.7 44 31.5 44 24c0-1.34-.14-2.65-.39-3.92z" />
        </svg>
    );
}

function Chip({ icon: Icon, text }: { icon: typeof ShoppingBag; text: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            <Icon className="size-3.5" />
            {text}
        </span>
    );
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="animate-fade-in-up relative z-10 w-full max-w-md rounded-2xl border border-zinc-100 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="size-5" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

const fieldCls =
    'h-11 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-(--brand) focus:ring-2 focus:ring-(--brand)/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

function ChangePasswordModal({
    lang,
    authFetch,
    onClose,
    onChanged,
}: {
    lang: Lang;
    authFetch: (
        input: string,
        init?: RequestInit,
    ) => Promise<Response>;
    onClose: () => void;
    onChanged: () => void;
}) {
    const [current, setCurrent] = useState('');
    const [next, setNext] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function save() {
        setError('');
        if (!current || !next) return;
        setSaving(true);
        try {
            const res = await authFetch('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: next,
                }),
            });
            if (!res.ok) {
                const d = (await res.json().catch(() => null)) as {
                    message?: string;
                } | null;
                throw new Error(d?.message || tr(lang, 'updateFailed'));
            }
            onChanged();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : tr(lang, 'updateFailed'),
            );
            setSaving(false);
        }
    }

    return (
        <Modal title={tr(lang, 'changePassword')} onClose={onClose}>
            <div className="space-y-4">
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'currentPassword')}
                    </label>
                    <input
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        className={fieldCls}
                        autoComplete="current-password"
                    />
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                        {tr(lang, 'newPassword')}
                    </label>
                    <input
                        type="password"
                        value={next}
                        onChange={(e) => setNext(e.target.value)}
                        className={fieldCls}
                        autoComplete="new-password"
                    />
                </div>
                {error && (
                    <p className="text-sm font-medium text-red-600">{error}</p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                    >
                        {tr(lang, 'cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={save}
                        disabled={saving || !current || !next}
                        className="inline-flex items-center gap-2 rounded-full bg-(--brand) px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {saving && <Loader2 className="size-4 animate-spin" />}
                        {tr(lang, 'saveChanges')}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
