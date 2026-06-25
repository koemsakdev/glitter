'use client';

import { Loader2, Truck } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DetailSection } from '@/components/feedback/detail-section';
import { useToast } from '@/hooks/use-toast';
import {
    useCreateShipment,
    useOrderShipment,
    useUpdateShipment,
} from '@/features/shipments/use-shipments';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
    SHIPMENT_STATUSES,
    type Shipment,
    type ShipmentStatus,
} from '@/types/shipment';

const STATUS_LABEL: Record<ShipmentStatus, TranslationKey> = {
    pending: 'shipment.status.pending',
    processing: 'shipment.status.processing',
    shipped: 'shipment.status.shipped',
    in_transit: 'shipment.status.in_transit',
    delivered: 'shipment.status.delivered',
    returned: 'shipment.status.returned',
    cancelled: 'shipment.status.cancelled',
};
const STATUS_STYLE: Record<ShipmentStatus, string> = {
    pending: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
    shipped: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
    in_transit:
        'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    delivered:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    returned: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

function toDateInput(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
}

export function OrderFulfillmentCard({ orderId }: { orderId: string }) {
    const { t } = useI18n();
    const { data: shipment, isLoading } = useOrderShipment(orderId);

    return (
        <DetailSection title={t('order.detail.fulfillment')}>
            {isLoading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <FulfillmentForm
                    key={shipment?.id ?? 'new'}
                    orderId={orderId}
                    shipment={shipment ?? null}
                />
            )}
        </DetailSection>
    );
}

function FulfillmentForm({
    orderId,
    shipment,
}: {
    orderId: string;
    shipment: Shipment | null;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const create = useCreateShipment();
    const update = useUpdateShipment();

    const [carrierName, setCarrierName] = useState(shipment?.carrierName ?? '');
    const [trackingNumber, setTrackingNumber] = useState(
        shipment?.trackingNumber ?? '',
    );
    const [status, setStatus] = useState<ShipmentStatus>(
        shipment?.status ?? 'pending',
    );
    const [shippedDate, setShippedDate] = useState(
        toDateInput(shipment?.shippedDate),
    );
    const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
        toDateInput(shipment?.estimatedDeliveryDate),
    );
    const [actualDeliveryDate, setActualDeliveryDate] = useState(
        toDateInput(shipment?.actualDeliveryDate),
    );

    const pending = create.isPending || update.isPending;

    function onError(error: unknown) {
        toast({
            title: t('common.toast.error'),
            description: getErrorMessage(error),
            variant: 'destructive',
        });
    }

    function handleSave() {
        const values = {
            carrierName: carrierName.trim() || undefined,
            trackingNumber: trackingNumber.trim() || undefined,
            status,
            shippedDate: shippedDate || null,
            estimatedDeliveryDate: estimatedDeliveryDate || null,
            actualDeliveryDate: actualDeliveryDate || null,
        };
        const onSuccess = () =>
            toast({ title: t('shipment.saved'), variant: 'success' });
        if (shipment) {
            update.mutate(
                { id: shipment.id, values },
                { onSuccess, onError },
            );
        } else {
            create.mutate({ orderId, values }, { onSuccess, onError });
        }
    }

    const inputCls = 'h-9';
    const labelCls = 'mb-1 block text-xs font-medium text-muted-foreground';

    return (
        <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Truck className="size-4 text-muted-foreground" />
                        <span
                            className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                STATUS_STYLE[status],
                            )}
                        >
                            {t(STATUS_LABEL[status])}
                        </span>
                        {!shipment && (
                            <span className="text-xs italic text-muted-foreground">
                                {t('shipment.none')}
                            </span>
                        )}
                    </div>

                    <div>
                        <label className={labelCls}>{t('shipment.status')}</label>
                        <Select
                            value={status}
                            onValueChange={(v) =>
                                setStatus(v as ShipmentStatus)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue>
                                    {(v) =>
                                        t(STATUS_LABEL[v as ShipmentStatus])
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {SHIPMENT_STATUSES.map((s) => (
                                    <SelectItem key={s} value={s}>
                                        {t(STATUS_LABEL[s])}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className={labelCls}>{t('shipment.carrier')}</label>
                        <Input
                            value={carrierName}
                            onChange={(e) => setCarrierName(e.target.value)}
                            placeholder="VET / J&T / Grab"
                            className={inputCls}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>
                            {t('shipment.tracking')}
                        </label>
                        <Input
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            className={cn(inputCls, 'font-mono')}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className={labelCls}>
                                {t('shipment.shippedDate')}
                            </label>
                            <DatePicker
                                value={shippedDate}
                                onChange={setShippedDate}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('shipment.eta')}
                            </label>
                            <DatePicker
                                value={estimatedDeliveryDate}
                                onChange={setEstimatedDeliveryDate}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('shipment.deliveredDate')}
                            </label>
                            <DatePicker
                                value={actualDeliveryDate}
                                onChange={setActualDeliveryDate}
                            />
                        </div>
                    </div>

                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={pending}
                        className="w-full bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {pending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {shipment
                            ? t('shipment.save')
                            : t('shipment.create')}
                    </Button>
        </div>
    );
}
