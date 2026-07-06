import { OrdersView } from '@/components/account/orders-view';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'My orders' };

export default async function OrdersPage() {
    const lang = await getLang();
    return <OrdersView lang={lang} />;
}
