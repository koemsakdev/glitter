'use client';

import { Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCustomerWishlist } from '@/features/wishlists/use-wishlists';
import { getFileUrl } from '@/lib/file-url';
import { formatPrice } from '@/lib/formatters';
import { useI18n } from '@/lib/i18n';

export function CustomerWishlistSection({ userId }: { userId: string }) {
    const { t, language } = useI18n();
    const { data: products = [], isLoading } = useCustomerWishlist(userId);

    if (isLoading) return null;

    return (
        <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <Heart className="size-4 text-pink-500" />
                {t('customer.wishlist.title')}
                {products.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                        ({products.length})
                    </span>
                )}
            </h2>
            {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    {t('customer.wishlist.empty')}
                </p>
            ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {products.map((p) => {
                        const name = language === 'km' ? p.nameKm : p.nameEn;
                        const img = getFileUrl(
                            p.images?.find((i) => i.imageType === 'primary')
                                ?.imageUrl ??
                                p.images?.[0]?.imageUrl ??
                                null,
                        );
                        return (
                            <li key={p.id}>
                                <Link
                                    href={`/dashboard/products/${p.id}`}
                                    className="flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-muted/40"
                                >
                                    <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                                        {img && (
                                            <Image
                                                src={img}
                                                alt={name}
                                                fill
                                                className="object-cover"
                                                unoptimized
                                            />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-1 text-sm font-medium">
                                            {name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatPrice(p.price)}
                                        </p>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
