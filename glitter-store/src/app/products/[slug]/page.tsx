import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
    fileUrl,
    formatPrice,
    getAvailability,
    getProductBySlug,
} from '@/lib/api';
import { getLang, pick, tr } from '@/lib/locale';
import type { Metadata } from 'next';

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
    const [product, lang] = await Promise.all([
        getProductBySlug(slug),
        getLang(),
    ]);
    if (!product) notFound();

    const availability = await getAvailability(product.id);

    const name = pick(lang, product.nameEn, product.nameKm);
    const secondaryName =
        lang === 'km' ? product.nameEn : product.nameKm;
    const description = pick(
        lang,
        product.descriptionEn ?? '',
        product.descriptionKm ?? '',
    );
    const details = pick(lang, product.detailsEn ?? '', product.detailsKm ?? '');

    const images = product.images ?? [];
    const primary =
        images.find((i) => i.imageType === 'primary') ?? images[0] ?? null;
    const heroUrl = fileUrl(primary?.imageUrl);
    const variants = product.variants ?? [];
    const hasDiscount =
        product.originalPrice != null && product.originalPrice > product.price;
    const inStock = product.totalStock > 0;

    const byBranch = new Map<string, { name: string; qty: number }>();
    for (const b of availability?.branches ?? []) {
        const branchName = pick(lang, b.branchNameEn, b.branchNameKm);
        const cur = byBranch.get(b.branchId);
        if (cur) cur.qty += b.quantityAvailable;
        else byBranch.set(b.branchId, { name: branchName, qty: b.quantityAvailable });
    }
    const branches = [...byBranch.values()].filter((b) => b.qty > 0);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <nav className="mb-6 text-sm text-zinc-500">
                <Link href="/products" className="hover:text-(--brand)">
                    {tr(lang, 'shop')}
                </Link>
                <span className="mx-2">/</span>
                <span className="text-zinc-700">{name}</span>
            </nav>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Gallery */}
                <div>
                    <div className="aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100">
                        {heroUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={heroUrl}
                                alt={name}
                                className="size-full object-cover"
                            />
                        ) : (
                            <div className="flex size-full items-center justify-center text-zinc-300">
                                <svg className="size-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <rect x="3" y="3" width="18" height="18" rx="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {images.length > 1 && (
                        <div className="mt-3 grid grid-cols-5 gap-2">
                            {images.slice(0, 5).map((im) => {
                                const u = fileUrl(im.imageUrl);
                                return (
                                    <div
                                        key={im.id}
                                        className="aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100"
                                    >
                                        {u && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={u} alt="" className="size-full object-cover" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Info */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
                        {name}
                    </h1>
                    {secondaryName && secondaryName !== name && (
                        <p className="mt-1 text-zinc-500">{secondaryName}</p>
                    )}

                    <div className="mt-3">
                        {product.reviewCount === 0 ? (
                            <span className="text-sm text-zinc-400">
                                {tr(lang, 'noReviews')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-2 text-sm">
                                <Stars value={product.averageRating} />
                                <span className="text-zinc-500">
                                    {product.averageRating.toFixed(1)} · {product.reviewCount}
                                </span>
                            </span>
                        )}
                    </div>

                    <div className="mt-4 flex items-baseline gap-3">
                        <span className="text-3xl font-bold text-(--brand)">
                            {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                            <span className="text-lg text-zinc-400 line-through">
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                    </div>

                    <div className="mt-3">
                        {inStock ? (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                {tr(lang, 'inStock')}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500">
                                <span className="size-2 rounded-full bg-zinc-400" />
                                {tr(lang, 'outOfStock')}
                            </span>
                        )}
                    </div>

                    {variants.length > 0 && (
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {tr(lang, 'availableOptions')}
                            </h2>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {variants.map((v) => {
                                    const label =
                                        [v.size, v.color].filter(Boolean).join(' · ') ||
                                        v.variantSku;
                                    return (
                                        <span
                                            key={v.id}
                                            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                                        >
                                            {v.colorHex && (
                                                <span
                                                    className="size-3.5 rounded-full border border-zinc-300"
                                                    style={{ backgroundColor: v.colorHex }}
                                                />
                                            )}
                                            {label}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-8">
                        <button
                            type="button"
                            disabled
                            className="w-full cursor-not-allowed rounded-full bg-(--brand) px-6 py-3 text-sm font-semibold text-white opacity-60 sm:w-auto sm:px-10"
                        >
                            {tr(lang, 'addToCart')}
                        </button>
                        <p className="mt-2 text-xs text-zinc-400">
                            {tr(lang, 'checkoutSoon')}
                        </p>
                    </div>

                    {branches.length > 0 && (
                        <div className="mt-6 rounded-xl border border-zinc-200 p-4">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {tr(lang, 'availableAt')}
                            </h2>
                            <ul className="mt-2 space-y-1.5 text-sm">
                                {branches.map((b) => (
                                    <li
                                        key={b.name}
                                        className="flex items-center justify-between"
                                    >
                                        <span className="text-zinc-600">{b.name}</span>
                                        <span className="font-medium text-zinc-900">
                                            {b.qty} {tr(lang, 'inStockCount')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {description && (
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {tr(lang, 'description')}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                                {description}
                            </p>
                        </div>
                    )}
                    {details && (
                        <div className="mt-6">
                            <h2 className="text-sm font-semibold text-zinc-900">
                                {tr(lang, 'details')}
                            </h2>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                                {details}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function Stars({ value }: { value: number }) {
    return (
        <span className="inline-flex">
            {Array.from({ length: 5 }, (_, i) => (
                <svg
                    key={i}
                    className="size-4"
                    viewBox="0 0 24 24"
                    fill={value >= i + 1 ? '#f59e0b' : '#e4e4e7'}
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </span>
    );
}
