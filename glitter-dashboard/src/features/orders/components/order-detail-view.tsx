'use client';

import {
    ArrowLeft,
    Check,
    ExternalLink,
    Loader2,
    MapPin,
    Package,
    Phone,
    Printer,
    Truck,
    User,
    X,
} from 'lucide-react';
import { Fragment } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-url';
import {
    DetailField,
    DetailSection,
} from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useToast } from '@/hooks/use-toast';
import {
    useOrder,
    useUpdateOrderStatus,
    useUpdatePaymentStatus,
} from '@/features/orders/use-orders';
import { getErrorMessage } from '@/lib/api-client';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import {
    ORDER_TRANSITIONS,
    type Order,
    type OrderStatus,
    type PaymentMethod,
} from '@/types/order';
import {
    OrderSourceBadge,
    OrderStatusBadge,
    PaymentStatusBadge,
} from './order-status-badge';

const DELIVERY_METHOD_LABELS: Record<string, TranslationKey> = {
    cod: 'order.delivery.cod',
    grab: 'order.delivery.grab',
    pickup: 'order.delivery.pickup',
    vet_express: 'order.delivery.vetExpress',
};
const ORDER_PAYMENT_METHOD_LABELS: Record<string, TranslationKey> = {
    khqr: 'order.delivery.payKhqr',
    cod: 'order.delivery.payCod',
    on_pickup: 'order.delivery.payOnPickup',
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'order.payment.method.aba',
};

/** True for any ABA / KHQR payment (real-API confirmed; no proof involved). */
function isAbaKhqr(
    paymentMethod: string | null,
    paymentMethodName: string | null,
): boolean {
    const m = paymentMethod ?? '';
    return (
        m === 'khqr' ||
        m === 'aba_khqr' ||
        m === 'aba_ecommerce' ||
        /khqr|aba/i.test(paymentMethodName ?? '')
    );
}

function formatDate(value: string | null): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(d);
}

export function OrderDetailView({ id }: { id: string }) {
    const { t } = useI18n();
    const { toast } = useToast();
    const { data: order, isLoading, isError, refetch } = useOrder(id);
    const updateStatus = useUpdateOrderStatus();
    const updatePayment = useUpdatePaymentStatus();

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

    const allowedNext = ORDER_TRANSITIONS[order.source]?.[order.status] ?? [];

    // The natural forward step — one button, so staff move the order one stage
    // at a time instead of picking from many transitions at once.
    const FORWARD: Partial<Record<OrderStatus, OrderStatus>> = {
        pending: 'processing',
        paid: 'processing',
        processing: 'shipped',
        shipped: 'completed',
    };
    const forwardNext = FORWARD[order.status];
    const primaryNext =
        forwardNext && allowedNext.includes(forwardNext)
            ? forwardNext
            : undefined;
    // The one "negative" exit available at this stage (cancel before fulfilment,
    // refund after) — kept subtle so it isn't confused with the main action.
    const exitNext: OrderStatus | undefined = allowedNext.includes('cancelled')
        ? 'cancelled'
        : allowedNext.includes('refunded')
          ? 'refunded'
          : undefined;

    // Visual progress: the forward stages, and where this order sits.
    const STEP_FLOW: OrderStatus[] = [
        'pending',
        'processing',
        'shipped',
        'completed',
    ];
    const STEP_POS: Record<OrderStatus, number> = {
        awaiting_payment: 0,
        pending: 0,
        paid: 0,
        processing: 1,
        shipped: 2,
        completed: 3,
        cancelled: -1,
        expired: -1,
        refunded: -1,
    };
    const currentPos = STEP_POS[order.status];
    const terminated =
        order.status === 'cancelled' ||
        order.status === 'expired' ||
        order.status === 'refunded';

    function handleStatusChange(next: OrderStatus) {
        updateStatus.mutate(
            { id, status: next },
            {
                onSuccess: () =>
                    toast({
                        title: t('order.toast.statusUpdated'),
                        variant: 'success',
                    }),
                onError: (error) =>
                    toast({
                        title: t('common.toast.error'),
                        description: getErrorMessage(error),
                        variant: 'destructive',
                    }),
            },
        );
    }

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-mono text-2xl font-bold tracking-tight sm:text-3xl">
                            {order.orderNumber}
                        </h1>
                        <OrderStatusBadge status={order.status} />
                        <OrderSourceBadge source={order.source} />
                        <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                        {order.branchName ? ` · ${order.branchName}` : ''}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href="/dashboard/orders">
                                <ArrowLeft className="mr-2 size-4" />
                                {t('common.back')}
                            </Link>
                        }
                    />
                    <Button
                        variant="outline"
                        nativeButton={false}
                        render={
                            <Link href={`/dashboard/orders/${id}/receipt`}>
                                <Printer className="mr-2 size-4" />
                                {t('order.receipt.print')}
                            </Link>
                        }
                    />
                </div>
            </div>

            {/* Order progress — a clear step flow instead of a row of buttons */}
            <div className="rounded-xl border bg-card p-4 sm:p-5">
                {terminated ? (
                    <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <X className="size-5" />
                        </span>
                        <div>
                            <OrderStatusBadge status={order.status} />
                            <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(order.updatedAt)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center">
                        {STEP_FLOW.map((step, i) => {
                            const done = i < currentPos;
                            const active = i === currentPos;
                            return (
                                <Fragment key={step}>
                                    <div className="flex flex-col items-center gap-1.5">
                                        <span
                                            className={`flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                                                done
                                                    ? 'border-pink-400 bg-pink-400 text-white dark:border-pink-600 dark:bg-pink-600'
                                                    : active
                                                      ? 'border-pink-400 bg-pink-50 text-pink-600 dark:border-pink-600 dark:bg-pink-500/10 dark:text-pink-300'
                                                      : 'border-border bg-background text-muted-foreground'
                                            }`}
                                        >
                                            {done ? (
                                                <Check className="size-4" />
                                            ) : (
                                                i + 1
                                            )}
                                        </span>
                                        <span
                                            className={`text-center text-[11px] leading-tight ${
                                                done || active
                                                    ? 'font-medium text-foreground'
                                                    : 'text-muted-foreground'
                                            }`}
                                        >
                                            {t(
                                                `order.status.${step}` as const,
                                            )}
                                        </span>
                                    </div>
                                    {i < STEP_FLOW.length - 1 && (
                                        <span
                                            className={`mx-1 mb-5 h-0.5 flex-1 rounded-full ${
                                                i < currentPos
                                                    ? 'bg-pink-400 dark:bg-pink-600'
                                                    : 'bg-border'
                                            }`}
                                        />
                                    )}
                                </Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
                    {primaryNext && (
                        <Button
                            disabled={updateStatus.isPending}
                            onClick={() => handleStatusChange(primaryNext)}
                            className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        >
                            {updateStatus.isPending && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            {t('order.detail.changeTo')}{' '}
                            {t(`order.status.${primaryNext}` as const)}
                        </Button>
                    )}
                    {order.paymentStatus !== 'refunded' && (
                        <Button
                            variant="outline"
                            disabled={updatePayment.isPending}
                            onClick={() =>
                                updatePayment.mutate(
                                    {
                                        id,
                                        paymentStatus:
                                            order.paymentStatus === 'paid'
                                                ? 'unpaid'
                                                : 'paid',
                                    },
                                    {
                                        onSuccess: () =>
                                            toast({
                                                title: t(
                                                    'order.toast.paymentUpdated',
                                                ),
                                                variant: 'success',
                                            }),
                                        onError: (error) =>
                                            toast({
                                                title: t('common.toast.error'),
                                                description:
                                                    getErrorMessage(error),
                                                variant: 'destructive',
                                            }),
                                    },
                                )
                            }
                        >
                            {updatePayment.isPending && (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            )}
                            {order.paymentStatus === 'paid'
                                ? t('order.payment.markUnpaid')
                                : t('order.payment.markPaid')}
                        </Button>
                    )}
                    {exitNext && (
                        <Button
                            variant="ghost"
                            disabled={updateStatus.isPending}
                            onClick={() => handleStatusChange(exitNext)}
                            className="ml-auto text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            {t('order.detail.changeTo')}{' '}
                            {t(`order.status.${exitNext}` as const)}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Items + summary (left, 2/3) */}
                <div className="space-y-6 lg:col-span-2">
                    <DetailSection title={t('order.detail.items')}>
                        <OrderItemsTable order={order} />
                    </DetailSection>
                </div>

                {/* Sidebar (right, 1/3) */}
                <div className="space-y-6">

                    {/* Customer */}
                    <DetailSection title={t('order.detail.customer')}>
                        <div className="space-y-2.5">
                            <DetailField label={t('order.col.customer')}>
                                <span className="inline-flex items-center gap-2">
                                    <User className="size-3.5 text-muted-foreground" />
                                    {order.customerName ?? (
                                        <span className="italic text-muted-foreground">
                                            {t('order.customer.walkIn')}
                                        </span>
                                    )}
                                </span>
                            </DetailField>
                            {order.customerPhone && (
                                <DetailField label={t('branch.field.phone')}>
                                    <span className="inline-flex items-center gap-2">
                                        <Phone className="size-3.5 text-muted-foreground" />
                                        <span className="font-mono">
                                            {order.customerPhone}
                                        </span>
                                    </span>
                                </DetailField>
                            )}
                        </div>
                    </DetailSection>

                    {/* Delivery (online orders) */}
                    {order.deliveryMethod && (
                        <DetailSection title={t('order.detail.delivery')}>
                            <div className="space-y-2.5">
                                <DetailField label={t('order.delivery.method')}>
                                    <span className="inline-flex items-center gap-2">
                                        <Truck className="size-3.5 text-muted-foreground" />
                                        {order.deliveryMethodName ||
                                            (DELIVERY_METHOD_LABELS[
                                                order.deliveryMethod
                                            ]
                                                ? t(
                                                      DELIVERY_METHOD_LABELS[
                                                          order.deliveryMethod
                                                      ],
                                                  )
                                                : order.deliveryMethod)}
                                        {(order.deliveryRegionName ||
                                            order.deliveryRegion) && (
                                            <span className="text-xs text-muted-foreground">
                                                ·{' '}
                                                {order.deliveryRegionName ||
                                                    (order.deliveryRegion ===
                                                    'phnom_penh'
                                                        ? t('order.delivery.pp')
                                                        : order.deliveryRegion ===
                                                            'province'
                                                          ? t(
                                                                'order.delivery.province',
                                                            )
                                                          : order.deliveryRegion)}
                                            </span>
                                        )}
                                    </span>
                                </DetailField>
                                {order.paymentMethod && (
                                    <DetailField
                                        label={t('order.delivery.payVia')}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            {isAbaKhqr(
                                                order.paymentMethod,
                                                order.paymentMethodName,
                                            ) && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src="/khqr.png"
                                                    alt="KHQR"
                                                    className="h-5 w-auto shrink-0 rounded"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display =
                                                            'none';
                                                    }}
                                                />
                                            )}
                                            <span>
                                                {isAbaKhqr(
                                                    order.paymentMethod,
                                                    order.paymentMethodName,
                                                )
                                                    ? 'ABA KHQR'
                                                    : (order.paymentMethodName ??
                                                          '')
                                                          .replace(
                                                              /\s*\([^)]*\)\s*$/,
                                                              '',
                                                          )
                                                          .trim() ||
                                                      (ORDER_PAYMENT_METHOD_LABELS[
                                                          order.paymentMethod
                                                      ]
                                                          ? t(
                                                                ORDER_PAYMENT_METHOD_LABELS[
                                                                    order
                                                                        .paymentMethod
                                                                ],
                                                            )
                                                          : order.paymentMethod)}
                                            </span>
                                        </span>
                                    </DetailField>
                                )}
                                {order.deliveryAddress && (
                                    <DetailField
                                        label={t('order.delivery.address')}
                                    >
                                        <span className="inline-flex items-start gap-2">
                                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                                            <span>{order.deliveryAddress}</span>
                                        </span>
                                        {order.deliveryLat != null &&
                                            order.deliveryLng != null && (
                                                <a
                                                    href={`https://www.google.com/maps?q=${order.deliveryLat},${order.deliveryLng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-pink-600 hover:underline dark:text-pink-400"
                                                >
                                                    {t('order.delivery.viewMap')}
                                                    <ExternalLink className="size-3" />
                                                </a>
                                            )}
                                    </DetailField>
                                )}
                                {order.paymentProofUrl && (
                                    <DetailField
                                        label={t('order.delivery.proof')}
                                    >
                                        <a
                                            href={
                                                getFileUrl(
                                                    order.paymentProofUrl,
                                                ) ?? '#'
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-1 block"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={
                                                    getFileUrl(
                                                        order.paymentProofUrl,
                                                    ) ?? ''
                                                }
                                                alt="payment proof"
                                                className="h-40 w-auto rounded-lg border object-contain transition-opacity hover:opacity-90"
                                            />
                                        </a>
                                    </DetailField>
                                )}
                            </div>
                        </DetailSection>
                    )}

                    {/* Payments — only when there are recorded (POS) payments.
                        Online orders carry their payment info in the Delivery
                        section + the payment-status badge, so an empty
                        "No payments recorded" block is just noise. */}
                    {order.payments.length > 0 && (
                        <DetailSection title={t('order.detail.payments')}>
                            <div className="space-y-2.5">
                                {order.payments.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between gap-2 text-sm"
                                    >
                                        <span className="text-muted-foreground">
                                            {t(PAYMENT_METHOD_LABELS[p.method])}
                                            {p.reference ? (
                                                <span className="ml-1 font-mono text-xs">
                                                    · {p.reference}
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {formatPrice(p.amount)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </DetailSection>
                    )}

                    {/* Metadata */}
                    <DetailSection title={t('order.detail.metadata')}>
                        <div className="space-y-2.5">
                            {order.note && (
                                <DetailField label={t('order.detail.note')}>
                                    <span className="whitespace-pre-wrap">
                                        {order.note}
                                    </span>
                                </DetailField>
                            )}
                            <DetailField label={t('order.detail.created')}>
                                {formatDate(order.createdAt)}
                            </DetailField>
                            <DetailField label={t('order.detail.updated')}>
                                {formatDate(order.updatedAt)}
                            </DetailField>
                        </div>
                    </DetailSection>
                </div>
            </div>
        </div>
    );
}

function OrderItemsTable({ order }: { order: Order }) {
    const { t } = useI18n();

    return (
        <div className="space-y-4">
            {/* Readable item list with product thumbnails */}
            <div className="divide-y divide-border rounded-lg border border-border/60">
                {order.items.map((item) => {
                    const img = getFileUrl(item.productImageUrl);
                    // Show the colour as a real swatch, never a raw hex code.
                    const swatch =
                        item.colorHex ||
                        (item.color?.startsWith('#') ? item.color : null);
                    const colorName =
                        item.color && !item.color.startsWith('#')
                            ? item.color
                            : null;
                    const variantText = [item.size, colorName]
                        .filter(Boolean)
                        .join(' · ');
                    return (
                        <div
                            key={item.id}
                            className="flex items-center gap-3 p-3"
                        >
                            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">
                                {img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={img}
                                        alt={item.productName}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <Package className="size-5 text-muted-foreground/50" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="font-medium leading-snug">
                                    {item.productName}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                    {swatch && (
                                        <span
                                            className="inline-block size-3 shrink-0 rounded-full border border-border"
                                            style={{ backgroundColor: swatch }}
                                            title={item.color ?? undefined}
                                        />
                                    )}
                                    <span>
                                        {variantText ? `${variantText} · ` : ''}
                                        {item.quantity} ×{' '}
                                        {formatPrice(item.unitPrice)}
                                    </span>
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/70">
                                    {item.variantSku}
                                </p>
                            </div>
                            <p className="shrink-0 text-right font-semibold tabular-nums">
                                {formatPrice(item.lineTotal)}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                        {t('order.detail.subtotal')}
                    </span>
                    <span className="tabular-nums">{formatPrice(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            {t('order.detail.discount')}
                            {order.voucherCode && (
                                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold uppercase text-foreground">
                                    {order.voucherCode}
                                </span>
                            )}
                        </span>
                        <span className="tabular-nums text-amber-600 dark:text-amber-400">
                            −{formatPrice(order.discountTotal)}
                        </span>
                    </div>
                )}
                {order.shippingCost > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            {t('order.detail.shipping')}
                        </span>
                        <span className="tabular-nums">
                            {formatPrice(order.shippingCost)}
                        </span>
                    </div>
                )}
                {order.taxAmount > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                            {t('order.detail.tax')}
                        </span>
                        <span className="tabular-nums">
                            {formatPrice(order.taxAmount)}
                        </span>
                    </div>
                )}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-bold">
                    <span>{t('order.detail.total')}</span>
                    <span className="tabular-nums text-pink-600 dark:text-pink-300">
                        {formatPrice(order.grandTotal)}
                    </span>
                </div>
            </div>
        </div>
    );
}
