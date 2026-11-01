'use client';

import { Banknote, QrCode, Store, Truck, Wallet } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    CheckoutFormShell,
    ChoiceCard,
    FormGroup,
} from '@/features/settings/components/checkout-form-shell';
import { LogoPicker } from '@/features/settings/components/logo-picker';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import type {
    DeliveryMethod,
    DeliveryMethodType,
    DeliveryRegion,
    PaymentRule,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return `method-${Math.random().toString(36).slice(2, 8)}`;
}

export function DeliveryMethodFormDialog({
    open,
    method,
    regions,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    method?: DeliveryMethod | null;
    regions: DeliveryRegion[];
    onOpenChange: (open: boolean) => void;
    onSave: (method: DeliveryMethod) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(method);

    const [nameEn, setNameEn] = useState(method?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(method?.nameKm ?? '');
    const [iconUrl, setIconUrl] = useState(method?.iconUrl ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [type, setType] = useState<DeliveryMethodType>(
        method?.type ?? 'delivery',
    );
    const [regionId, setRegionId] = useState(
        method?.regionId ?? regions[0]?.id ?? '',
    );
    const [fee, setFee] = useState(String(method?.fee ?? 0));
    const [payment, setPayment] = useState<PaymentRule>(
        method?.payment ?? 'prepay',
    );
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!nameEn.trim() && !nameKm.trim()) {
            toast({
                title: t('settings.delivery.nameRequired'),
                variant: 'destructive',
            });
            return;
        }
        setSaving(true);
        try {
            const finalIcon = file ? (await uploadImage(file, 0)).url : iconUrl;
            onSave({
                id: method?.id ?? newId(),
                nameEn: nameEn.trim(),
                nameKm: nameKm.trim(),
                iconUrl: finalIcon,
                type,
                regionId,
                fee: Math.max(0, Number(fee) || 0),
                payment,
                enabled: method?.enabled ?? true,
            });
        } catch (error) {
            toast({
                title: t('settings.uploadFailed'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    }

    const feeNum = Number(fee) || 0;

    return (
        <CheckoutFormShell
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t('settings.delivery.editMethod')
                    : t('settings.delivery.addMethod')
            }
            subtitle={t('settings.delivery.methodFormHint')}
            isEdit={isEdit}
            saving={saving}
            onSave={handleSave}
        >
            <LogoPicker
                value={iconUrl}
                file={file}
                onPick={(f) => {
                    setFile(f);
                    if (!f) setIconUrl('');
                }}
                label={t('settings.delivery.icon')}
                hint={t('settings.delivery.iconHint')}
            />
            <BilingualField
                label={t('settings.delivery.methodName')}
                en={nameEn}
                km={nameKm}
                onEn={setNameEn}
                onKm={setNameKm}
            />

            <FormGroup label={t('settings.delivery.type')}>
                <div role="radiogroup" className="grid gap-2 sm:grid-cols-2">
                    <ChoiceCard
                        active={type === 'delivery'}
                        onClick={() => setType('delivery')}
                        icon={Truck}
                        title={t('settings.delivery.typeDelivery')}
                        description={t('settings.delivery.typeDeliveryHint')}
                    />
                    <ChoiceCard
                        active={type === 'pickup'}
                        onClick={() => setType('pickup')}
                        icon={Store}
                        title={t('settings.delivery.typePickup')}
                        description={t('settings.delivery.typePickupHint')}
                    />
                </div>
            </FormGroup>

            <div className="grid gap-5 sm:grid-cols-2">
                <FormGroup label={t('settings.delivery.region')}>
                    <Select
                        value={regionId}
                        onValueChange={(v) => setRegionId(v ?? '')}
                    >
                        <SelectTrigger className="h-10 w-full">
                            <SelectValue>
                                {(v: string) => {
                                    const r = regions.find((x) => x.id === v);
                                    return r?.nameEn || r?.nameKm || v;
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {regions.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                    {r.nameEn || r.nameKm || r.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </FormGroup>

                <FormGroup label={t('settings.delivery.fee')}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                $
                            </span>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={fee}
                                onChange={(e) => setFee(e.target.value)}
                                className={`${inputClass} pl-7`}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setFee('0')}
                            className={cn(
                                'h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold transition-colors',
                                feeNum === 0
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                    : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {t('settings.delivery.free')}
                        </button>
                    </div>
                </FormGroup>
            </div>

            <FormGroup
                label={t('settings.delivery.paymentRule')}
                hint={t('settings.delivery.paymentRuleHint')}
            >
                <div role="radiogroup" className="grid gap-2">
                    <ChoiceCard
                        active={payment === 'prepay'}
                        onClick={() => setPayment('prepay')}
                        icon={QrCode}
                        title={t('settings.delivery.rule.prepay')}
                        description={t('settings.delivery.rule.prepayHint')}
                    />
                    <ChoiceCard
                        active={payment === 'on_pickup'}
                        onClick={() => setPayment('on_pickup')}
                        icon={Banknote}
                        title={t('settings.delivery.rule.onReceive')}
                        description={t('settings.delivery.rule.onReceiveHint')}
                    />
                    <ChoiceCard
                        active={payment === 'either'}
                        onClick={() => setPayment('either')}
                        icon={Wallet}
                        title={t('settings.delivery.rule.either')}
                        description={t('settings.delivery.rule.eitherHint')}
                    />
                </div>
            </FormGroup>
        </CheckoutFormShell>
    );
}
