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
import { BannerImageUploader } from '@/features/settings/components/banner-image-uploader';
import { IconUploader } from '@/features/settings/components/icon-uploader';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import type {
    PaymentOption,
    PaymentOptionType,
} from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return `pay-${Math.random().toString(36).slice(2, 8)}`;
}

export function PaymentOptionFormDialog({
    open,
    option,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    option?: PaymentOption | null;
    onOpenChange: (open: boolean) => void;
    onSave: (option: PaymentOption) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(option);

    const [nameEn, setNameEn] = useState(option?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(option?.nameKm ?? '');
    const [iconUrl, setIconUrl] = useState(option?.iconUrl ?? '');
    const [iconFile, setIconFile] = useState<File | null>(null);
    const [type, setType] = useState<PaymentOptionType>(option?.type ?? 'qr');
    const [qrImageUrl, setQrImageUrl] = useState(option?.qrImageUrl ?? '');
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [accountName, setAccountName] = useState(option?.accountName ?? '');
    const [note, setNote] = useState(option?.note ?? '');
    const [provider, setProvider] = useState(option?.provider ?? '');
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
            const finalIcon = iconFile
                ? (await uploadImage(iconFile, 0)).url
                : iconUrl;
            const finalQr =
                type === 'qr' && qrFile
                    ? (await uploadImage(qrFile, 0)).url
                    : qrImageUrl;
            onSave({
                id: option?.id ?? newId(),
                nameEn: nameEn.trim(),
                nameKm: nameKm.trim(),
                iconUrl: finalIcon,
                type,
                enabled: option?.enabled ?? true,
                qrImageUrl: type === 'qr' ? finalQr : '',
                accountName: type === 'qr' ? accountName.trim() : '',
                note: type === 'qr' ? note.trim() : '',
                provider: type === 'external' ? provider.trim() : '',
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
                            ? t('settings.delivery.editPayment')
                            : t('settings.delivery.addPayment')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <IconUploader
                        value={iconUrl}
                        file={iconFile}
                        onPick={(f) => {
                            setIconFile(f);
                            if (!f) setIconUrl('');
                        }}
                        label={t('settings.delivery.icon')}
                        hint={t('settings.delivery.iconHint')}
                    />
                    <BilingualField
                        label={t('settings.delivery.paymentName')}
                        en={nameEn}
                        km={nameKm}
                        onEn={setNameEn}
                        onKm={setNameKm}
                    />

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.delivery.paymentType')}
                        </label>
                        <Select
                            value={type}
                            onValueChange={(v) =>
                                v && setType(v as PaymentOptionType)
                            }
                        >
                            <SelectTrigger className="h-10 w-full">
                                <SelectValue>
                                    {(v: string) =>
                                        t(
                                            v === 'qr'
                                                ? 'settings.delivery.typeQr'
                                                : v === 'external'
                                                  ? 'settings.delivery.typeExternal'
                                                  : 'settings.delivery.typeOnDelivery',
                                        )
                                    }
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="qr">
                                    {t('settings.delivery.typeQr')}
                                </SelectItem>
                                <SelectItem value="on_delivery">
                                    {t('settings.delivery.typeOnDelivery')}
                                </SelectItem>
                                <SelectItem value="external">
                                    {t('settings.delivery.typeExternal')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {type === 'qr' && (
                        <div className="space-y-4 rounded-lg border bg-muted/30 p-3">
                            <BannerImageUploader
                                value={qrImageUrl}
                                file={qrFile}
                                onPick={(f) => {
                                    setQrFile(f);
                                    if (!f) setQrImageUrl('');
                                }}
                                label={t('settings.delivery.qrImage')}
                                hint={t('settings.delivery.qrImageHint')}
                                boxClass="mx-auto aspect-square w-40"
                                imageFit="contain"
                            />
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">
                                    {t('settings.delivery.accountName')}
                                </label>
                                <Input
                                    value={accountName}
                                    onChange={(e) =>
                                        setAccountName(e.target.value)
                                    }
                                    className={inputClass}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">
                                    {t('settings.delivery.khqrNoteField')}
                                </label>
                                <Input
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    )}

                    {type === 'external' && (
                        <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                            <label className="text-sm font-medium">
                                {t('settings.delivery.provider')}
                            </label>
                            <Input
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                placeholder="aba_payway / wing / bakong"
                                className={inputClass}
                            />
                            <p className="text-xs text-muted-foreground">
                                {t('settings.delivery.externalHint')}
                            </p>
                        </div>
                    )}
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
