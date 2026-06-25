import { WishlistView } from '@/components/auth/wishlist-view';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My wishlist' };

export default async function WishlistPage() {
    const lang = await getLang();
    return <WishlistView lang={lang} />;
}
