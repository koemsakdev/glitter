import { NotFoundView } from '@/components/not-found-view';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'Page not found' };

/** Shown for any URL that doesn't match a page (and for notFound()). */
export default async function NotFound() {
    const lang = await getLang();
    return <NotFoundView lang={lang} />;
}
