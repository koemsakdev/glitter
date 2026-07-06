'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ProductCard } from '@/components/product-card';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/lib/auth';
import { useWishlist } from '@/lib/wishlist';
import { tr, type Lang } from '@/lib/locale';

export function WishlistView({ lang }: { lang: Lang }) {
    const router = useRouter();
    const { user, loading } = useAuth();
    const { products, loading: wlLoading } = useWishlist();

    useEffect(() => {
        if (!loading && !user) router.replace('/account/login');
    }, [loading, user, router]);

    if (loading || !user) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-zinc-400">
                …
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl px-4 py-12">
            <BackLink lang={lang} fallbackHref="/account" className="mb-3" />
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {tr(lang, 'myWishlist')}
            </h1>

            {wlLoading ? (
                <p className="mt-6 text-sm text-zinc-400">…</p>
            ) : products.length === 0 ? (
                <p className="mt-6 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 py-16 text-center text-sm text-zinc-400">
                    {tr(lang, 'wishlistEmpty')}
                </p>
            ) : (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {products.map((p) => (
                        <ProductCard key={p.id} product={p} lang={lang} />
                    ))}
                </div>
            )}
        </div>
    );
}
