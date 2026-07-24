'use client';

import { Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import {
    BilingualField,
} from '@/features/settings/components/settings-shared';
import { NAV_ICONS, NAV_ICON_NAMES } from '@/features/settings/nav-icons';
import type { StoreNavItem } from '@/features/settings/store-config';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface NavItemFormDialogProps {
    open: boolean;
    item: StoreNavItem | null;
    /** Built-in default label, shown as the field placeholder. */
    defaultLabel?: string;
    onOpenChange: (open: boolean) => void;
    onSave: (item: StoreNavItem) => void;
}

/** Per-item editor for a header menu: rename (EN/KM) + pick an icon. */
export function NavItemFormDialog({
    open,
    item,
    defaultLabel,
    onOpenChange,
    onSave,
}: NavItemFormDialogProps) {
    const { t } = useI18n();
    const [labelEn, setLabelEn] = useState(item?.labelEn ?? '');
    const [labelKm, setLabelKm] = useState(item?.labelKm ?? '');
    const [icon, setIcon] = useState(item?.icon ?? '');

    function handleSave() {
        if (!item) return;
        onSave({
            ...item,
            labelEn: labelEn.trim(),
            labelKm: labelKm.trim(),
            icon,
        });
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
                        {defaultLabel
                            ? `${t('settings.nav.editTitle')} · ${defaultLabel}`
                            : t('settings.nav.editTitle')}
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        {t('settings.nav.editSubtitle')}
                    </p>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <BilingualField
                        label={t('settings.nav.name')}
                        en={labelEn}
                        km={labelKm}
                        onEn={setLabelEn}
                        onKm={setLabelKm}
                    />

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                            {t('settings.nav.chooseIcon')}
                        </label>
                        <div className="grid grid-cols-8 gap-1.5">
                            {NAV_ICON_NAMES.map((name) => {
                                const I = NAV_ICONS[name];
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        title={name}
                                        onClick={() => setIcon(name)}
                                        className={cn(
                                            'flex aspect-square items-center justify-center rounded-lg border text-foreground transition-colors hover:bg-muted',
                                            icon === name &&
                                                'border-pink-400 bg-pink-500/10 text-pink-500',
                                        )}
                                    >
                                        <I className="size-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
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
                        <Save className="size-4" />
                        {t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
