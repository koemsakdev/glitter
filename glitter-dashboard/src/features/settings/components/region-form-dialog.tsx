'use client';

import { useState } from 'react';
import { CheckoutFormShell } from '@/features/settings/components/checkout-form-shell';
import { LogoPicker } from '@/features/settings/components/logo-picker';
import { BilingualField } from '@/features/settings/components/settings-shared';
import type { DeliveryRegion } from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return `region-${Math.random().toString(36).slice(2, 8)}`;
}

export function RegionFormDialog({
    open,
    region,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    region?: DeliveryRegion | null;
    onOpenChange: (open: boolean) => void;
    onSave: (region: DeliveryRegion) => void;
}) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(region);

    const [nameEn, setNameEn] = useState(region?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(region?.nameKm ?? '');
    const [iconUrl, setIconUrl] = useState(region?.iconUrl ?? '');
    const [file, setFile] = useState<File | null>(null);
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
                id: region?.id ?? newId(),
                nameEn: nameEn.trim(),
                nameKm: nameKm.trim(),
                iconUrl: finalIcon,
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
        <CheckoutFormShell
            open={open}
            onOpenChange={onOpenChange}
            title={
                isEdit
                    ? t('settings.delivery.editRegion')
                    : t('settings.delivery.addRegion')
            }
            subtitle={t('settings.delivery.regionFormHint')}
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
                label={t('settings.delivery.regionName')}
                en={nameEn}
                km={nameKm}
                onEn={setNameEn}
                onKm={setNameKm}
            />
        </CheckoutFormShell>
    );
}
