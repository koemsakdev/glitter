'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { IconUploader } from '@/features/settings/components/icon-uploader';
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
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-md"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.delivery.editRegion')
                            : t('settings.delivery.addRegion')}
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
                        label={t('settings.delivery.regionName')}
                        en={nameEn}
                        km={nameKm}
                        onEn={setNameEn}
                        onKm={setNameKm}
                    />
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
