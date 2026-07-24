import { notFound } from 'next/navigation';
import { getPage } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { pick } from '@/lib/locale';
import type { Metadata } from 'next';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPage(slug);
    if (!page || !page.isPublished) return {};
    const lang = await getLang();
    return { title: pick(lang, page.titleEn, page.titleKm) };
}

export default async function CustomPage({ params }: Params) {
    const { slug } = await params;
    const [page, lang] = await Promise.all([getPage(slug), getLang()]);

    if (!page || !page.isPublished) notFound();

    const title = pick(lang, page.titleEn, page.titleKm);
    const body = pick(lang, page.bodyEn ?? '', page.bodyKm ?? '');

    return (
        <div className="mx-auto max-w-3xl px-4 py-12">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {title}
            </h1>
            {body && (
                <div className="mt-6 whitespace-pre-line wrap-break-word leading-relaxed text-zinc-600 dark:text-zinc-300">
                    {body}
                </div>
            )}
        </div>
    );
}
