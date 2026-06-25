'use client';

import { ImageIcon, Loader2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SavingOverlay } from '@/components/feedback/saving-overlay';
import { useToast } from '@/hooks/use-toast';
import { useActiveBranches } from '@/features/branches/use-branches';
import { useCreateOrder } from '@/features/orders/use-orders';
import { useCustomers } from '@/features/users/use-users';
import { getErrorMessage } from '@/lib/api-client';
import { formatPrice } from '@/lib/formatters';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useSelectedBranchId } from '@/stores/use-branch-context';
import type {
    CreateOrderPayload,
    OrderSource,
    PaymentMethod,
} from '@/types/order';
import { OrderItemPicker, type CartLine } from './order-item-picker';

const SOURCE_LABELS: Record<OrderSource, TranslationKey> = {
    in_store: 'order.source.in_store',
    online: 'order.source.online',
};

const PAYMENT_LABELS: Record<PaymentMethod, TranslationKey> = {
    cash: 'order.payment.method.cash',
    khqr: 'order.payment.method.khqr',
    aba: 'order.payment.method.aba',
};

function round2(n: number): number {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function OrderCreateForm() {
    const { t, language } = useI18n();
    const router = useRouter();
    const { toast } = useToast();
    const selectedBranchId = useSelectedBranchId();
    const createOrder = useCreateOrder();

    const { data: branches } = useActiveBranches();
    const { data: customers } = useCustomers();

    const [source, setSource] = useState<OrderSource>('in_store');
    const [branchId, setBranchId] = useState<string>(selectedBranchId ?? '');
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [note, setNote] = useState('');
    const [discount, setDiscount] = useState(0);
    const [shipping, setShipping] = useState(0);
    const [tax, setTax] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
    const [items, setItems] = useState<CartLine[]>([]);

    const branchOptions: ComboboxOption[] = useMemo(
        () =>
            (branches ?? []).map((b) => ({
                value: b.id,
                label: language === 'km' ? b.branchNameKm : b.branchNameEn,
                secondary: b.branchCode,
            })),
        [branches, language],
    );

    const customerOptions: ComboboxOption[] = useMemo(
        () => [
            { value: '', label: t('order.create.customerWalkInOption') },
            ...(customers ?? []).map((c) => ({
                value: c.id,
                label: c.fullName,
                secondary: c.phoneNumber ?? c.email ?? undefined,
            })),
        ],
        [customers, t],
    );

    function handleCustomerChange(value: string) {
        setCustomerId(value);
        const customer = (customers ?? []).find((c) => c.id === value);
        if (customer) {
            setCustomerName(customer.fullName);
            setCustomerPhone(customer.phoneNumber ?? '');
        }
    }

    const subtotal = useMemo(
        () => round2(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)),
        [items],
    );
    const grandTotal = round2(
        Math.max(0, subtotal - discount) + shipping + tax,
    );

    function addLine(line: CartLine) {
        setItems((prev) => {
            const existing = prev.find(
                (l) => l.productVariantId === line.productVariantId,
            );
            if (existing) {
                return prev.map((l) =>
                    l.productVariantId === line.productVariantId
                        ? { ...l, quantity: l.quantity + line.quantity }
                        : l,
                );
            }
            return [...prev, line];
        });
    }

    function updateQty(variantId: string, qty: number) {
        setItems((prev) =>
            prev.map((l) =>
                l.productVariantId === variantId
                    ? { ...l, quantity: Math.max(1, qty) }
                    : l,
            ),
        );
    }

    function removeLine(variantId: string) {
        setItems((prev) => prev.filter((l) => l.productVariantId !== variantId));
    }

    const canSubmit =
        branchId !== '' && items.length > 0 && !createOrder.isPending;

    async function handleSubmit() {
        if (!branchId) {
            toast({
                title: t('common.toast.error'),
                description: t('order.create.selectBranch'),
                variant: 'destructive',
            });
            return;
        }
        if (items.length === 0) {
            toast({
                title: t('common.toast.error'),
                description: t('order.create.noItems'),
                variant: 'destructive',
            });
            return;
        }

        const payload: CreateOrderPayload = {
            source,
            branchId,
            customerId: customerId || undefined,
            customerName: customerName.trim() || undefined,
            customerPhone: customerPhone.trim() || undefined,
            note: note.trim() || undefined,
            discountTotal: discount > 0 ? round2(discount) : undefined,
            shippingCost: shipping > 0 ? round2(shipping) : undefined,
            taxAmount: tax > 0 ? round2(tax) : undefined,
            items: items.map((l) => ({
                productVariantId: l.productVariantId,
                quantity: l.quantity,
            })),
            payments:
                source === 'in_store'
                    ? [{ method: paymentMethod, amount: grandTotal }]
                    : undefined,
        };

        try {
            const order = await createOrder.mutateAsync(payload);
            toast({ title: t('order.create.success'), variant: 'success' });
            router.push(`/dashboard/orders/${order.id}`);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <div className="space-y-6 pb-12">
            <SavingOverlay open={createOrder.isPending} />

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('order.create.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('order.create.subtitle')}
                    </p>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={createOrder.isPending}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!canSubmit}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {createOrder.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('order.create.submit')}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Items (left, 2/3) */}
                <div className="space-y-6 lg:col-span-2">
                    <FormCard title={t('order.create.addItem')}>
                        <OrderItemPicker branchId={branchId} onAdd={addLine} />
                    </FormCard>

                    <FormCard title={t('order.detail.items')}>
                        {items.length === 0 ? (
                            <p className="py-6 text-center text-sm italic text-muted-foreground">
                                {t('order.create.empty')}
                            </p>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto rounded-lg border border-border/60">
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-border">
                                            {items.map((line) => (
                                                <tr
                                                    key={line.productVariantId}
                                                    className="bg-card"
                                                >
                                                    <td className="px-3 py-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                                                                {line.imageUrl ? (
                                                                    <Image
                                                                        src={line.imageUrl}
                                                                        alt={line.productName}
                                                                        width={44}
                                                                        height={44}
                                                                        className="size-full object-cover"
                                                                        unoptimized
                                                                    />
                                                                ) : (
                                                                    <ImageIcon className="size-4 text-muted-foreground/40" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="truncate font-medium">
                                                                    {line.productName}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    {line.color &&
                                                                        line.colorHex && (
                                                                            <span
                                                                                className="inline-block size-3 shrink-0 rounded-full border border-border"
                                                                                style={{
                                                                                    backgroundColor:
                                                                                        line.colorHex,
                                                                                }}
                                                                            />
                                                                        )}
                                                                    <span>
                                                                        {[line.size, line.color]
                                                                            .filter(Boolean)
                                                                            .join(' · ') ||
                                                                            line.variantSku}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                                                        {formatPrice(line.unitPrice)}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={line.quantity}
                                                            onChange={(e) =>
                                                                updateQty(
                                                                    line.productVariantId,
                                                                    e.target.value === ''
                                                                        ? 1
                                                                        : Number(e.target.value),
                                                                )
                                                            }
                                                            className="h-9 w-20"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">
                                                        {formatPrice(
                                                            line.unitPrice * line.quantity,
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-2.5">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                removeLine(line.productVariantId)
                                                            }
                                                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="ml-auto w-full max-w-xs space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            {t('order.detail.subtotal')}
                                        </span>
                                        <span className="tabular-nums">
                                            {formatPrice(subtotal)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">
                                            {t('order.detail.discount')}
                                        </span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={discount || ''}
                                                onChange={(e) =>
                                                    setDiscount(
                                                        e.target.value === ''
                                                            ? 0
                                                            : Number(e.target.value),
                                                    )
                                                }
                                                className="h-9 pl-6 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">
                                            {t('order.detail.shipping')}
                                        </span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={shipping || ''}
                                                onChange={(e) =>
                                                    setShipping(
                                                        e.target.value === ''
                                                            ? 0
                                                            : Number(e.target.value),
                                                    )
                                                }
                                                className="h-9 pl-6 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-muted-foreground">
                                            {t('order.detail.tax')}
                                        </span>
                                        <div className="relative w-28">
                                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                min={0}
                                                step="0.01"
                                                value={tax || ''}
                                                onChange={(e) =>
                                                    setTax(
                                                        e.target.value === ''
                                                            ? 0
                                                            : Number(e.target.value),
                                                    )
                                                }
                                                className="h-9 pl-6 text-right"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-border/60 pt-2 text-base font-bold">
                                        <span>{t('order.detail.total')}</span>
                                        <span className="tabular-nums text-pink-600 dark:text-pink-300">
                                            {formatPrice(grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </FormCard>
                </div>

                {/* Settings (right, 1/3) */}
                <div className="space-y-6">
                    <FormCard title={t('order.create.settings')}>
                        <div className="space-y-4">
                            <Field label={t('order.col.source')}>
                                <Select
                                    value={source}
                                    onValueChange={(v) => v && setSource(v as OrderSource)}
                                >
                                    <SelectTrigger className="h-11 w-full">
                                        <SelectValue>
                                            {(v: string) => t(SOURCE_LABELS[v as OrderSource])}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="in_store">
                                            {t('order.source.in_store')}
                                        </SelectItem>
                                        <SelectItem value="online">
                                            {t('order.source.online')}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label={t('order.col.branch')}>
                                <Combobox
                                    options={branchOptions}
                                    value={branchId}
                                    onChange={setBranchId}
                                    placeholder={t('order.create.selectBranch')}
                                />
                            </Field>

                            {source === 'in_store' && (
                                <Field label={t('order.field.paymentMethod')}>
                                    <Select
                                        value={paymentMethod}
                                        onValueChange={(v) =>
                                            v && setPaymentMethod(v as PaymentMethod)
                                        }
                                    >
                                        <SelectTrigger className="h-11 w-full">
                                            <SelectValue>
                                                {(v: string) =>
                                                    t(PAYMENT_LABELS[v as PaymentMethod])
                                                }
                                            </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cash">
                                                {t('order.payment.method.cash')}
                                            </SelectItem>
                                            <SelectItem value="khqr">
                                                {t('order.payment.method.khqr')}
                                            </SelectItem>
                                            <SelectItem value="aba">
                                                {t('order.payment.method.aba')}
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </div>
                    </FormCard>

                    <FormCard title={t('order.detail.customer')}>
                        <div className="space-y-4">
                            <Field label={t('order.field.customer')}>
                                <Combobox
                                    options={customerOptions}
                                    value={customerId}
                                    onChange={handleCustomerChange}
                                    placeholder={t('order.create.customerWalkInOption')}
                                    searchPlaceholder={t('order.field.customer')}
                                />
                            </Field>
                            <Field label={t('order.field.customerName')}>
                                <Input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder={t('order.customer.walkIn')}
                                    className="h-11"
                                />
                            </Field>
                            <Field label={t('order.field.customerPhone')}>
                                <Input
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    placeholder="+855..."
                                    className="h-11"
                                />
                            </Field>
                        </div>
                    </FormCard>

                    <FormCard title={t('order.detail.note')}>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={3}
                            placeholder={t('order.detail.note')}
                        />
                    </FormCard>
                </div>
            </div>
        </div>
    );
}

function FormCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-lg border bg-card">
            <div className="border-b px-6 py-4">
                <h2 className="text-base font-semibold">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}
