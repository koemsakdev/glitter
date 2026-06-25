import Link from 'next/link';
import { QuickAddButton } from '@/components/quick-add-button';
import { WishlistButton } from '@/components/wishlist-button';
import { fileUrl, formatPrice } from '@/lib/api';
import { pick, tr, type Lang } from '@/lib/locale';
import type { Product } from '@/lib/types';

export function ProductCard({
    product,
    lang,
}: {
    product: Product;
    lang: Lang;
}) {
    const name = pick(lang, product.nameEn, product.nameKm);
    const primary =
        product.images?.find((i) => i.imageType === 'primary') ??
        product.images?.[0];
    const img = fileUrl(primary?.imageUrl);
    const hasDiscount =
        product.originalPrice != null && product.originalPrice > product.price;
    const discountPct = hasDiscount
        ? Math.round((1 - product.price / (product.originalPrice as number)) * 100)
        : 0;
    const outOfStock = product.totalStock <= 0;

    return (
        <div className="group relative flex flex-col overflow-hidden rounded-(--ui-radius) border border-zinc-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-(--brand)/40 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900 dark:hover:shadow-black/40">
            <Link
                href={`/products/${product.slug}`}
                className="flex flex-1 flex-col"
            >
                <div className="relative aspect-square overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                    {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={img}
                            alt={name}
                            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    ) : (
                        <div className="flex size-full items-center justify-center text-zinc-300">
                            <svg
                                className="size-10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                            >
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="9" cy="9" r="2" />
                                <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                            </svg>
                        </div>
                    )}

                    {hasDiscount && (
                        <span className="absolute left-2 top-2 rounded-full bg-(--brand) px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                            -{discountPct}%
                        </span>
                    )}
                    {outOfStock && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                            <span className="rounded-full bg-zinc-900/85 px-3 py-1 text-[11px] font-medium text-white">
                                {tr(lang, 'soldOut')}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                            {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs text-zinc-400 line-through">
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                    </div>
                    <h3 className="mt-1 line-clamp-2 pr-9 text-[13px] leading-snug text-zinc-600 transition-colors group-hover:text-(--brand) dark:text-zinc-400">
                        {name}
                    </h3>
                </div>
            </Link>

            <WishlistButton
                productId={product.id}
                className="absolute right-2 top-2"
            />
            {!outOfStock && (
                <QuickAddButton
                    product={product}
                    lang={lang}
                    className="absolute bottom-2.5 right-2.5"
                />
            )}
        </div>
    );
}
