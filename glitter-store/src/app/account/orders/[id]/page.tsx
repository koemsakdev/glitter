import { OrderDetailView } from '@/components/account/order-detail-view';
import { getLang } from '@/lib/lang';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Order details' };

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const [lang, { id }] = await Promise.all([getLang(), params]);
    return <OrderDetailView lang={lang} id={id} />;
}
