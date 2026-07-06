import { Sparkles } from 'lucide-react';
import { BrandSearchGrid } from '@/components/brand-search-grid';
import { fileUrl, getActiveBrands } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { tr } from '@/lib/locale';

export const metadata = { title: 'Brands' };

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export default async function BrandsPage() {
    const [lang, brands] = await Promise.all([
        getLang(),
        getActiveBrands().catch(() => []),
    ]);

    const cards = brands.map((b) => ({
        id: b.id,
        name: b.name,
        logo: fileUrl(b.logoUrl),
    }));

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            {/* Header */}
            <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-(--brand)/10 px-3 py-1 text-xs font-semibold text-(--brand)">
                    <Sparkles className="size-3.5" />
                    {tr(lang, 'brandsTitle')}
                </span>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {tr(lang, 'brandsTitle')}
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'brandsSubtitle')}
                </p>
            </div>

            <BrandSearchGrid
                brands={cards}
                labels={{
                    search: tr(lang, 'searchBrands'),
                    empty: tr(lang, 'noBrands'),
                    viewProducts: tr(lang, 'viewProducts'),
                }}
            />
        </div>
    );
}
