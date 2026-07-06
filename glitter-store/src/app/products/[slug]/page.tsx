import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    ChevronRight,
    RotateCcw,
    ShieldCheck,
    Star,
    Truck,
} from 'lucide-react';
import { AddToCart } from '@/components/add-to-cart';
import { ProductCard } from '@/components/product-card';
import { ProductGallery } from '@/components/product-gallery';
import { ProductReviews } from '@/components/product-reviews';
import { WishlistButton } from '@/components/wishlist-button';
import {
    formatPrice,
    getProductBySlug,
    getProductReviews,
    getRelatedProducts,
    getStoreConfig,
} from '@/lib/api';
import { getLang } from '@/lib/lang';
import { pick, tr } from '@/lib/locale';
import type { Metadata } from 'next';

// Always render fresh from the API — never serve a cached page/badge state.
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    return { title: product?.nameEn ?? 'Product' };
}

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const [product, lang, config] = await Promise.all([
        getProductBySlug(slug),
        getLang(),
        getStoreConfig(),
    ]);
    if (!product) notFound();

    const [productReviews, related] = await Promise.all([
        getProductReviews(product.id),
        getRelatedProducts(product.id),
    ]);

    const name = pick(lang, product.nameEn, product.nameKm);
    const secondaryName = lang === 'km' ? product.nameEn : product.nameKm;
    const description = pick(
        lang,
        product.descriptionEn ?? '',
        product.descriptionKm ?? '',
    );
    const details = pick(lang, product.detailsEn ?? '', product.detailsKm ?? '');

    const images = product.images ?? [];
    const hasDiscount =
        product.originalPrice != null && product.originalPrice > product.price;
    const discountPct = hasDiscount
        ? Math.round(
              (1 - product.price / (product.originalPrice as number)) * 100,
          )
        : 0;
    const inStock = product.totalStock > 0;
    const freeOver = config.delivery.freeOver;

    const perks = [
        {
            Icon: Truck,
            title: tr(lang, 'featDelivery'),
            sub:
                freeOver > 0
                    ? `${tr(lang, 'featDeliverySub')} ${formatPrice(freeOver)}`
                    : tr(lang, 'featDeliveryAny'),
        },
        {
            Icon: ShieldCheck,
            title: tr(lang, 'featSecure'),
            sub: tr(lang, 'featSecureSub'),
        },
        {
            Icon: RotateCcw,
            title: tr(lang, 'featReturns'),
            sub: tr(lang, 'featReturnsSub'),
        },
    ];

    return (
        <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
            {/* Breadcrumb */}
            <nav className="mb-6 flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                <Link href="/" className="hover:text-(--brand)">
                    {tr(lang, 'home')}
                </Link>
                <ChevronRight className="size-3.5" />
                <Link href="/products" className="hover:text-(--brand)">
                    {tr(lang, 'shop')}
                </Link>
                <ChevronRight className="size-3.5" />
                <span className="truncate font-medium text-zinc-700 dark:text-zinc-200">
                    {name}
                </span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-12">
                {/* Gallery */}
                <ProductGallery images={images} name={name} />

                {/* Info */}
                <div>
                    {/* Badges */}
                    {product.badges && product.badges.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                            {product.badges.map((b, i) => {
                                const label = pick(
                                    lang,
                                    b.badgeLabelEn ?? '',
                                    b.badgeLabelKm ?? '',
                                );
                                if (!label) return null;
                                return (
                                    <span
                                        key={`${b.badgeType}-${i}`}
                                        style={
                                            {
                                                '--badge':
                                                    b.badgeIconColor ?? '#64748b',
                                            } as React.CSSProperties
                                        }
                                        className="product-badge rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
                                    >
                                        {label}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                        {name}
                    </h1>
                    {secondaryName && secondaryName !== name && (
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                            {secondaryName}
                        </p>
                    )}

                    {/* Rating + stock */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                        {product.reviewCount === 0 ? (
                            <span className="text-sm text-zinc-400">
                                {tr(lang, 'noReviews')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm">
                                <Stars value={product.averageRating} />
                                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                                    {product.averageRating.toFixed(1)}
                                </span>
                                <span className="text-zinc-400">
                                    ({product.reviewCount})
                                </span>
                            </span>
                        )}
                        {inStock ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                {tr(lang, 'inStock')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                {tr(lang, 'outOfStock')}
                            </span>
                        )}
                    </div>

                    {/* Price */}
                    <div className="mt-5 flex flex-wrap items-baseline gap-3">
                        <span className="text-3xl font-extrabold text-(--brand)">
                            {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                            <>
                                <span className="text-lg text-zinc-400 line-through">
                                    {formatPrice(product.originalPrice)}
                                </span>
                                <span className="rounded-full bg-(--brand)/10 px-2 py-0.5 text-sm font-bold text-(--brand)">
                                    -{discountPct}%
                                </span>
                            </>
                        )}
                    </div>

                    {description && (
                        <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                            {description}
                        </p>
                    )}

                    {/* Variant selector + qty + add to cart */}
                    <AddToCart product={product} lang={lang} />

                    {/* Wishlist */}
                    <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        <WishlistButton
                            productId={product.id}
                            size="lg"
                            className="border border-zinc-200 dark:border-zinc-700"
                        />
                        {tr(lang, 'saveToWishlist')}
                    </div>

                    {/* Perks card */}
                    <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-zinc-100 bg-white p-4 shadow-sm sm:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-900">
                        {perks.map((p, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--brand)/10 text-(--brand)">
                                    <p.Icon className="size-4.5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                                        {p.title}
                                    </p>
                                    <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                        {p.sub}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* SKU */}
                    <div className="mt-5 flex gap-2 text-sm">
                        <span className="text-zinc-400">SKU:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-200">
                            {product.sku}
                        </span>
                    </div>
                </div>
            </div>

            {/* Details */}
            {details && (
                <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold text-zinc-900 dark:text-zinc-50">
                        <span className="h-5 w-1 rounded-full bg-(--brand)" />
                        {tr(lang, 'details')}
                    </h2>
                    <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                        {details}
                    </p>
                </section>
            )}

            <ProductReviews
                productId={product.id}
                lang={lang}
                reviews={productReviews.data}
                summary={productReviews.summary}
            />

            {related.length > 0 && (
                <section className="mt-12 border-t border-zinc-200 pt-8 dark:border-zinc-800">
                    <h2 className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        <span className="h-5 w-1 rounded-full bg-(--brand)" />
                        {tr(lang, 'youMayAlsoLike')}
                    </h2>
                    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {related.map((p) => (
                            <ProductCard key={p.id} product={p} lang={lang} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Stars({ value }: { value: number }) {
    const rounded = Math.round(value);
    return (
        <span className="inline-flex">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    className={
                        i < rounded
                            ? 'size-4 fill-amber-400 text-amber-400'
                            : 'size-4 fill-zinc-200 text-zinc-200 dark:fill-zinc-700 dark:text-zinc-700'
                    }
                />
            ))}
        </span>
    );
}
