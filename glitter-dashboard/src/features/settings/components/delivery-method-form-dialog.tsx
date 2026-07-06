'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { IconUploader } from '@/features/settings/components/icon-uploader';
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

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-md"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.delivery.editMethod')
                            : t('settings.delivery.addMethod')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <IconUploader
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

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.delivery.type')}
                            </label>
                            <Select
                                value={type}
                                onValueChange={(v) =>
                                    v && setType(v as DeliveryMethodType)
                                }
                            >
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue>
                                        {(v: string) =>
                                            t(
                                                v === 'pickup'
                                                    ? 'settings.delivery.typePickup'
                                                    : 'settings.delivery.typeDelivery',
                                            )
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="delivery">
                                        {t('settings.delivery.typeDelivery')}
                                    </SelectItem>
                                    <SelectItem value="pickup">
                                        {t('settings.delivery.typePickup')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.delivery.region')}
                            </label>
                            <Select
                                value={regionId}
                                onValueChange={(v) => setRegionId(v ?? '')}
                            >
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue>
                                        {(v: string) => {
                                            const r = regions.find(
                                                (x) => x.id === v,
                                            );
                                            return (
                                                r?.nameEn || r?.nameKm || v
                                            );
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
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.delivery.fee')}
                            </label>
                            <div className="relative">
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
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.delivery.paymentRule')}
                            </label>
                            <Select
                                value={payment}
                                onValueChange={(v) =>
                                    v && setPayment(v as PaymentRule)
                                }
                            >
                                <SelectTrigger className="h-10 w-full">
                                    <SelectValue>
                                        {(v: string) =>
                                            t(
                                                v === 'prepay'
                                                    ? 'settings.delivery.rule.prepay'
                                                    : v === 'either'
                                                      ? 'settings.delivery.rule.either'
                                                      : 'settings.delivery.rule.onReceive',
                                            )
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="prepay">
                                        {t('settings.delivery.rule.prepay')}
                                    </SelectItem>
                                    <SelectItem value="on_pickup">
                                        {t('settings.delivery.rule.onReceive')}
                                    </SelectItem>
                                    <SelectItem value="either">
                                        {t('settings.delivery.rule.either')}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
