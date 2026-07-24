'use client';

import { Download, Loader2, Send, X } from 'lucide-react';
import { ResponsiveModal } from '@/components/ui/responsive-modal';
import { ReceiptCard, type OrderInfo } from '@/components/checkout/receipt-card';
import { useReceiptDownload } from '@/lib/receipt-image';
import { tr, type Lang } from '@/lib/locale';

/** A bottom-sheet (mobile) / dialog (desktop) that shows the printable receipt
 *  for a past order, with download + share-to-Telegram actions. */
export function ReceiptModal({
    lang,
    orderInfo,
    brandName,
    logoUrl,
    telegramUrl,
    open,
    onClose,
}: {
    lang: Lang;
    orderInfo: OrderInfo;
    brandName?: string;
    logoUrl?: string | null;
    telegramUrl?: string;
    open: boolean;
    onClose: () => void;
}) {
    const { receiptRef, saving, download, share } = useReceiptDownload({
        orderNumber: orderInfo.orderNumber,
        lang,
        telegramUrl,
    });

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(o) => !o && onClose()}
            title={tr(lang, 'orderReceipt')}
            className="md:max-w-md"
        >
            <div className="flex min-h-0 flex-col">
                <div className="flex items-center justify-between px-5 pb-1 pt-4">
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'orderReceipt')}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={tr(lang, 'close')}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto px-4 py-2">
                    <ReceiptCard
                        ref={receiptRef}
                        lang={lang}
                        orderInfo={orderInfo}
                        brandName={brandName}
                        logoUrl={logoUrl}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2.5 border-t border-zinc-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:border-zinc-800">
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
            </div>
        </ResponsiveModal>
    );
}
