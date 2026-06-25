import { CartView } from '@/components/cart-view';
import { getLang } from '@/lib/lang';

export const metadata = { title: 'Cart' };

export default async function CartPage() {
    const lang = await getLang();
    return <CartView lang={lang} />;
}
