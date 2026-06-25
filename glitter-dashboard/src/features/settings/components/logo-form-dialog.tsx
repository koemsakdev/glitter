'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BannerImageUploader } from '@/features/settings/components/banner-image-uploader';
import { inputClass } from '@/features/settings/components/settings-shared';
import type { StoreLogo } from '@/features/settings/store-config';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import { uploadImage } from '@/lib/uploads';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

interface LogoFormDialogProps {
    open: boolean;
    logo?: StoreLogo | null;
    onOpenChange: (open: boolean) => void;
    onSave: (logo: StoreLogo) => void;
}

export function LogoFormDialog({
    open,
    logo,
    onOpenChange,
    onSave,
}: LogoFormDialogProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(logo);

    const [name, setName] = useState(logo?.name ?? '');
    const [url, setUrl] = useState(logo?.url ?? '');
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!file && !url) {
            toast({
                title: t('settings.general.logoImageRequired'),
                variant: 'destructive',
            });
            return;
        }
        setSaving(true);
        try {
            const finalUrl = file ? (await uploadImage(file, 80)).url : url;
            onSave({
                id: logo?.id ?? newId(),
                name: name.trim() || 'Logo',
                url: finalUrl,
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
                            ? t('settings.general.editLogo')
                            : t('settings.general.addLogo')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <BannerImageUploader
                        value={url}
                        file={file}
                        onPick={(f) => {
                            setFile(f);
                            if (!f) setUrl('');
                        }}
                        label={t('settings.banner.image')}
                        hint={t('settings.general.logoHint')}
                        boxClass="mx-auto aspect-square w-56"
                        imageFit="contain"
                    />

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.theme.name')}
                        </label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t(
                                'settings.general.logoNamePlaceholder',
                            )}
                            className={inputClass}
                        />
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
                        {isEdit
                            ? t('settings.saveChanges')
                            : t('settings.general.addLogo')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
