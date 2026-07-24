import Link from 'next/link';
import { Check, Download, Loader2, Send } from 'lucide-react';
import { tr, type Lang } from '@/lib/locale';
import { useReceiptDownload } from '@/lib/receipt-image';
import { ReceiptCard, type OrderInfo, type VerifiedReceipt } from './receipt-card';

export type { OrderInfo, VerifiedReceipt };

/** Success screen shown after an order is placed: the printable receipt card
 *  (when a full snapshot is available) plus download / share / navigation. */
export function OrderReceiptScreen({
    lang,
    placed,
    orderInfo,
    receipt,
    brandName,
    logoUrl,
    telegramUrl,
    showMyOrders,
}: {
    lang: Lang;
    placed: string | null;
    orderInfo: OrderInfo | null;
    receipt: VerifiedReceipt | null;
    brandName?: string;
    logoUrl?: string | null;
    telegramUrl?: string;
    showMyOrders: boolean;
}) {
    const { receiptRef, saving, download, share } = useReceiptDownload({
        orderNumber: orderInfo?.orderNumber ?? '',
        lang,
        telegramUrl,
    });

    return (
        <div className="flex min-h-[80vh] w-full items-center justify-center px-4 py-10 sm:py-14">
            <div className="w-full max-w-md sm:max-w-lg">
                {orderInfo ? (
                    <ReceiptCard
                        ref={receiptRef}
                        lang={lang}
                        orderInfo={orderInfo}
                        receipt={receipt}
                        brandName={brandName}
                        logoUrl={logoUrl}
                    />
                ) : (
                    <div className="text-center">
                        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15">
                            <Check className="size-8" />
                        </div>
                        <h1 className="mt-5 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {tr(lang, 'orderPlaced')}
                        </h1>
                        {placed && (
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {tr(lang, 'orderNumber')}:{' '}
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {placed}
                                </span>
                            </p>
                        )}
                    </div>
                )}

                <div className="mx-auto mt-6 space-y-2.5">
                    {orderInfo && (
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={download}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200"
                            >
                                {saving ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Download className="size-4" />
                                )}
                                {tr(lang, 'downloadReceipt')}
                            </button>
                            <button
                                type="button"
                                onClick={share}
                                disabled={saving}
                                className="flex items-center justify-center gap-2 rounded-2xl bg-[#229ED9] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                            >
                                <Send className="size-4" />
                                {tr(lang, 'shareReceipt')}
                            </button>
                        </div>
                    )}

                    <Link
                        href="/products"
                        className="flex w-full items-center justify-center rounded-2xl bg-(--brand) py-3.5 text-sm font-semibold text-white shadow-lg shadow-(--brand)/25 transition-opacity hover:opacity-90"
                    >
                        {tr(lang, 'continueShopping')}
                    </Link>
                    {showMyOrders && (
                        <Link
                            href="/account"
                            className="flex w-full items-center justify-center rounded-2xl border border-zinc-200 bg-white py-3.5 text-sm font-semibold text-zinc-700 transition-colors hover:border-(--brand) hover:text-(--brand) dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                        >
                            {tr(lang, 'myOrders')}
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
