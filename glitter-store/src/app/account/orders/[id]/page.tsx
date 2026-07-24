import { OrderDetailView } from '@/components/account/order-detail-view';
import { fileUrl, getStoreConfig } from '@/lib/api';
import { getLang } from '@/lib/lang';
import { pick } from '@/lib/locale';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Order details' };

// Fetch the latest store config (brand, logo, Telegram) for the receipt.
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const [lang, { id }, config] = await Promise.all([
        getLang(),
        params,
        getStoreConfig(),
    ]);
    return (
        <OrderDetailView
            lang={lang}
            id={id}
            brandName={pick(lang, config.brandNameEn, config.brandNameKm)}
            logoUrl={fileUrl(config.logoUrl)}
            telegramUrl={config.telegramUrl}
        />
    );
}
