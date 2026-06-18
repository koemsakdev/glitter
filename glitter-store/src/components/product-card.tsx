import Link from 'next/link';
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
    const outOfStock = product.totalStock <= 0;

    return (
        <Link
            href={`/products/${product.slug}`}
            className="group flex flex-col overflow-hidden rounded-(--ui-radius) border border-zinc-200 bg-white transition-shadow hover:shadow-md"
        >
            <div className="relative aspect-square overflow-hidden bg-zinc-100">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={img}
                        alt={name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex size-full items-center justify-center text-zinc-300">
                        <svg className="size-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                        </svg>
                    </div>
                )}
                {hasDiscount && (
                    <span className="absolute left-2 top-2 rounded-full bg-(--brand) px-2 py-0.5 text-[11px] font-semibold text-white">
                        {tr(lang, 'sale')}
                    </span>
                )}
                {outOfStock && (
                    <span className="absolute right-2 top-2 rounded-full bg-zinc-900/80 px-2 py-0.5 text-[11px] font-medium text-white">
                        {tr(lang, 'soldOut')}
                    </span>
                )}
            </div>

            <div className="flex flex-1 flex-col p-(--ui-pad)">
                <h3 className="line-clamp-2 text-sm font-medium text-zinc-900 group-hover:text-(--brand)">
                    {name}
                </h3>
                <div className="mt-auto flex items-baseline gap-2 pt-2">
                    <span className="text-base font-bold text-zinc-900">
                        {formatPrice(product.price)}
                    </span>
                    {hasDiscount && (
                        <span className="text-xs text-zinc-400 line-through">
                            {formatPrice(product.originalPrice)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
