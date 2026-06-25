'use client';

import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import type { Announcement } from '@/features/settings/store-config';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

interface AnnouncementDialogProps {
    open: boolean;
    item?: Announcement | null;
    onOpenChange: (open: boolean) => void;
    onSave: (announcement: Announcement) => void;
}

export function AnnouncementDialog({
    open,
    item,
    onOpenChange,
    onSave,
}: AnnouncementDialogProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const [textEn, setTextEn] = useState(item?.textEn ?? '');
    const [textKm, setTextKm] = useState(item?.textKm ?? '');
    const [enabled, setEnabled] = useState(item?.enabled ?? true);
    const [startAt, setStartAt] = useState(item?.startAt ?? '');
    const [endAt, setEndAt] = useState(item?.endAt ?? '');

    function handleSave() {
        if (!textEn.trim() && !textKm.trim()) {
            toast({
                title: t('settings.announce.required'),
                variant: 'destructive',
            });
            return;
        }
        onSave({
            id: item?.id ?? newId(),
            textEn: textEn.trim(),
            textKm: textKm.trim(),
            enabled,
            startAt: startAt || null,
            endAt: endAt || null,
        });
    }

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-lg"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('settings.announce.editTitle')
                            : t('settings.announce.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <BilingualField
                        label={t('settings.announce.text')}
                        en={textEn}
                        km={textKm}
                        onEn={setTextEn}
                        onKm={setTextKm}
                        textarea
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.announce.start')}
                            </label>
                            <Input
                                type="date"
                                value={startAt}
                                onChange={(e) => setStartAt(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.announce.end')}
                            </label>
                            <Input
                                type="date"
                                value={endAt}
                                onChange={(e) => setEndAt(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={enabled}
                            onCheckedChange={(v) => setEnabled(Boolean(v))}
                            className="data-checked:bg-pink-500 dark:data-checked:bg-pink-600"
                        />
                        <span className="text-sm font-medium">
                            {t('settings.sections.visible')}
                        </span>
                    </label>
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {isEdit
                            ? t('settings.saveChanges')
                            : t('settings.announce.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
