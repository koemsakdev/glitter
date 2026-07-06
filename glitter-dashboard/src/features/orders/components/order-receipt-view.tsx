'use client';

import { ArrowLeft, Printer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useOrder } from '@/features/orders/use-orders';
import { printElement } from '@/lib/print';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import type { PaymentMethod } from '@/types/order';

const PAYMENT_LABELS: Record<PaymentMethod, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'order.payment.method.aba',
};

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export function OrderReceiptView({ id }: { id: string }) {
    const { t } = useI18n();
    const { data: order, isLoading, isError, refetch } = useOrder(id);

    if (isLoading) return <LoadingScreen variant="page" />;
    if (isError || !order) {
        return (
            <ErrorState
                title={t('order.detail.errorTitle')}
                message={t('order.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    return (
        <div className="mx-auto max-w-md space-y-4">
            {/* Toolbar (not printed) */}
            <div className="no-print flex items-center justify-between">
                <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    className="text-muted-foreground hover:text-foreground"
                    render={
                        <Link href={`/dashboard/orders/${id}`}>
                            <ArrowLeft className="mr-1.5 size-4" />
                            {t('common.back')}
                        </Link>
                    }
                />
                <Button
                    size="sm"
                    onClick={() =>
                        printElement('print-receipt', order.orderNumber)
                    }
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    <Printer className="mr-1.5 size-4" />
                    {t('order.receipt.print')}
                </Button>
            </div>

            {/* The printable receipt */}
            <div
                id="print-receipt"
                className="rounded-lg border bg-white p-6 text-zinc-900 shadow-sm"
            >
                {/* Header */}
                <div className="flex flex-col items-center gap-2 border-b border-dashed border-zinc-300 pb-4 text-center">
                    <Image
                        src="/logo.png"
                        alt="Glitter"
                        width={48}
                        height={48}
                        className="rounded-md"
                        unoptimized
                    />
                    <div>
                        <div className="text-lg font-bold">{t('login.title')}</div>
                        {order.branchName && (
                            <div className="text-xs text-zinc-500">
                                {order.branchName}
                            </div>
                        )}
                    </div>
                </div>

                {/* Meta */}
                <div className="space-y-1 border-b border-dashed border-zinc-300 py-3 text-xs">
                    <div className="flex justify-between">
                        <span className="text-zinc-500">{t('order.col.orderNumber')}</span>
                        <span className="font-mono font-semibold">
                            {order.orderNumber}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-zinc-500">{t('order.col.date')}</span>
                        <span>{formatDate(order.createdAt)}</span>
                    </div>
                    {order.customerName && (
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t('order.col.customer')}</span>
                            <span>{order.customerName}</span>
                        </div>
                    )}
                </div>

                {/* Items */}
                <table className="w-full py-3 text-xs">
                    <tbody>
                        {order.items.map((item) => {
                            const label = [item.size, item.color]
                                .filter(Boolean)
                                .join(' · ');
                            return (
                                <tr key={item.id} className="align-top">
                                    <td className="py-1.5">
                                        <div className="font-medium">{item.productName}</div>
                                        <div className="text-zinc-500">
                                            {item.quantity} × {formatPrice(item.unitPrice)}
                                            {label ? ` · ${label}` : ''}
                                        </div>
                                    </td>
                                    <td className="py-1.5 text-right font-medium tabular-nums">
                                        {formatPrice(item.lineTotal)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="space-y-1 border-t border-dashed border-zinc-300 py-3 text-xs">
                    <div className="flex justify-between">
                        <span className="text-zinc-500">{t('order.detail.subtotal')}</span>
                        <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discountTotal > 0 && (
                        <div className="flex justify-between">
                            <span className="text-zinc-500">{t('order.detail.discount')}</span>
                            <span className="tabular-nums">
                                −{formatPrice(order.discountTotal)}
                            </span>
                        </div>
                    )}
                    <div className="flex justify-between border-t border-zinc-300 pt-1.5 text-sm font-bold">
                        <span>{t('order.detail.total')}</span>
                        <span className="tabular-nums">
                            {formatPrice(order.grandTotal)}
                        </span>
                    </div>
                </div>

                {/* Payments */}
                {order.payments.length > 0 && (
                    <div className="space-y-1 border-t border-dashed border-zinc-300 py-3 text-xs">
                        {order.payments.map((p) => (
                            <div key={p.id} className="flex justify-between">
                                <span className="text-zinc-500">
                                    {t(PAYMENT_LABELS[p.method])}
                                </span>
                                <span className="tabular-nums">
                                    {formatPrice(p.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-dashed border-zinc-300 pt-4 text-center text-xs text-zinc-500">
                    {t('order.receipt.thankYou')}
                </div>
            </div>
        </div>
    );
}
