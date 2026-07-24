import { forwardRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { formatPrice } from '@/lib/api';
import { tr, type Lang } from '@/lib/locale';

/** ABA-verified payment details echoed on the receipt. */
export type VerifiedReceipt = {
    tranId: string;
    apv: string;
    amount: string;
    currency: string;
    date: string;
    payer: string;
};

/** Snapshot of a placed order, shown as a printable receipt. `paid` flips true
 *  once payment is confirmed. */
export type OrderInfo = {
    orderNumber: string;
    date: string;
    customerName: string;
    subtotal: number;
    fee: number;
    discount: number;
    total: number;
    paymentName: string;
    deliveryName: string;
    payNow: boolean;
    paid: boolean;
    items: {
        name: string;
        variant: string;
        colorHex: string | null;
        qty: number;
        unitPrice: number;
        lineTotal: number;
    }[];
};

/** The printable receipt card — branded header, payment + product details,
 *  totals and footer. Shared by the checkout success screen and the order
 *  detail page. Forward the ref to capture it as an image. */
export const ReceiptCard = forwardRef<
    HTMLDivElement,
    {
        lang: Lang;
        orderInfo: OrderInfo;
        receipt?: VerifiedReceipt | null;
        brandName?: string;
        logoUrl?: string | null;
    }
>(function ReceiptCard({ lang, orderInfo, receipt, brandName, logoUrl }, ref) {
    const paidNow = orderInfo.paid || !!receipt;
    const orderDate = new Date(orderInfo.date).toLocaleString(
        lang === 'km' ? 'km-KH' : 'en-US',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        },
    );
    // One key/value line of the receipt.
    const row = (label: string, value: ReactNode) =>
        value ? (
            <div className="flex items-start justify-between gap-4 text-sm">
                <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">{label}</dt>
                <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                    {value}
                </dd>
            </div>
        ) : null;

    return (
        <div
            ref={ref}
            className="mx-auto overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
            {/* Branded header */}
            <div className="bg-(--brand)/5 px-6 pb-6 pt-7 text-center dark:bg-(--brand)/12">
                {logoUrl ? (
                    <div className="mx-auto size-16 overflow-hidden rounded-(--ui-radius) ring-1 ring-black/5 dark:ring-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            crossOrigin="anonymous"
                            src={logoUrl}
                            alt={brandName ?? 'logo'}
                            className="size-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-(--brand) text-white shadow-lg shadow-(--brand)/30">
                        <Check className="size-7" strokeWidth={3} />
                    </div>
                )}
                {brandName ? (
                    <p className="mt-2.5 text-lg font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                        {brandName}
                    </p>
                ) : null}
                <p className="mt-0.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {paidNow ? tr(lang, 'paymentSuccessful') : tr(lang, 'orderReceipt')}
                </p>
                <p className="mt-3 text-3xl font-extrabold text-(--brand)">
                    {formatPrice(orderInfo.total)}
                </p>
            </div>

            {/* Perforated divider */}
            <div className="relative">
                <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                <div className="mx-6 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
            </div>

            {/* Payment details */}
            <div className="px-6 pb-4 pt-5">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'paymentDetails')}
                    </h3>
                    {orderInfo.paid ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            {tr(lang, 'statusPaid')}
                        </span>
                    ) : orderInfo.payNow ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                            {tr(lang, 'statusAwaitingPayment')}
                        </span>
                    ) : (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                            {tr(lang, 'payOnDelivery')}
                        </span>
                    )}
                </div>
                <dl className="mt-3 space-y-2.5">
                    {row(tr(lang, 'orderNumber'), orderInfo.orderNumber)}
                    {row(tr(lang, 'orderTime'), orderDate)}
                    {row(tr(lang, 'customerLabel'), orderInfo.customerName)}
                    {row(tr(lang, 'paymentMethod'), orderInfo.paymentName)}
                    {row(tr(lang, 'deliveryMethod'), orderInfo.deliveryName)}
                    {receipt && row(tr(lang, 'receiptApproval'), receipt.apv)}
                    {receipt && row(tr(lang, 'receiptTxn'), receipt.tranId)}
                    {receipt && row(tr(lang, 'receiptPayer'), receipt.payer)}
                </dl>
            </div>

            {/* Perforated divider */}
            <div className="relative">
                <span className="absolute -left-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                <span className="absolute -right-2 top-1/2 size-4 -translate-y-1/2 rounded-full bg-zinc-50 dark:bg-zinc-950" />
                <div className="mx-6 border-t border-dashed border-zinc-300 dark:border-zinc-700" />
            </div>

            {/* Product details */}
            <div className="px-6 pb-5 pt-4">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {tr(lang, 'productDetails')}
                </h3>
                <dl className="mt-3 space-y-2.5">
                    {orderInfo.items.map((it, i) => (
                        <div
                            key={i}
                            className="flex items-start justify-between gap-4 text-sm"
                        >
                            <dt className="flex min-w-0 items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                                {it.colorHex && (
                                    <span
                                        className="inline-block size-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
                                        style={{ backgroundColor: it.colorHex }}
                                    />
                                )}
                                <span className="min-w-0">
                                    {it.name}
                                    {it.variant ? ` · ${it.variant}` : ''}
                                    <span className="text-zinc-400"> × {it.qty}</span>
                                </span>
                            </dt>
                            <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                                {formatPrice(it.lineTotal)}
                            </dd>
                        </div>
                    ))}
                </dl>
                <dl className="mt-3 space-y-2.5 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    {row(tr(lang, 'subtotal'), formatPrice(orderInfo.subtotal))}
                    {row(
                        tr(lang, 'deliveryFee'),
                        orderInfo.fee > 0 ? formatPrice(orderInfo.fee) : tr(lang, 'free'),
                    )}
                    {orderInfo.discount > 0 &&
                        row(tr(lang, 'discount'), `- ${formatPrice(orderInfo.discount)}`)}
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-700">
                    <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {tr(lang, 'total')}
                    </span>
                    <span className="text-lg font-extrabold text-(--brand)">
                        {formatPrice(orderInfo.total)}
                    </span>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-100 bg-zinc-50/60 px-6 py-4 text-center dark:border-zinc-800 dark:bg-zinc-800/30">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    {tr(lang, 'thankYouReceipt')}
                    {brandName ? ` · ${brandName}` : ''}
                </p>
            </div>
        </div>
    );
});
