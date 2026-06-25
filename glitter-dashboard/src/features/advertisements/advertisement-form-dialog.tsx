'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AdImageField } from './ad-image-field';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    AD_STATUSES,
    PLACEMENT_LOCATIONS,
    type Advertisement,
    type AdvertisementFormValues,
    type AdStatus,
    type PlacementLocation,
} from '@/types/advertisement';

const STATUS_LABEL: Record<AdStatus, TranslationKey> = {
    active: 'ad.status.active',
    inactive: 'ad.status.inactive',
    scheduled: 'ad.status.scheduled',
    archived: 'ad.status.archived',
};
const PLACEMENT_LABEL: Record<PlacementLocation, TranslationKey> = {
    home_top: 'ad.placement.home_top',
    home_middle: 'ad.placement.home_middle',
    sidebar: 'ad.placement.sidebar',
    product_page: 'ad.placement.product_page',
    footer: 'ad.placement.footer',
};

function toDateInput(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
}

interface AdFormDialogProps {
    open: boolean;
    item?: Advertisement | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: AdvertisementFormValues) => void;
}

export function AdFormDialog({
    open,
    item,
    pending,
    onOpenChange,
    onSubmit,
}: AdFormDialogProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const [titleEn, setTitleEn] = useState(item?.titleEn ?? '');
    const [titleKm, setTitleKm] = useState(item?.titleKm ?? '');
    const [contentEn, setContentEn] = useState(item?.contentEn ?? '');
    const [contentKm, setContentKm] = useState(item?.contentKm ?? '');
    const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
    const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? '');
    const [status, setStatus] = useState<AdStatus>(item?.status ?? 'active');
    const [startDate, setStartDate] = useState(toDateInput(item?.startDate));
    const [endDate, setEndDate] = useState(toDateInput(item?.endDate));
    const [placements, setPlacements] = useState<PlacementLocation[]>(
        item?.placements ?? [],
    );

    function togglePlacement(loc: PlacementLocation) {
        setPlacements((prev) =>
            prev.includes(loc)
                ? prev.filter((p) => p !== loc)
                : [...prev, loc],
        );
    }

    function handleSubmit() {
        if (!titleEn.trim() || !titleKm.trim()) {
            toast({ title: t('ad.required'), variant: 'destructive' });
            return;
        }
        onSubmit({
            titleEn: titleEn.trim(),
            titleKm: titleKm.trim(),
            // Send null (not undefined) so cleared fields are actually cleared.
            contentEn: contentEn.trim() || null,
            contentKm: contentKm.trim() || null,
            imageUrl: imageUrl.trim() || null,
            linkUrl: linkUrl.trim() || null,
            status,
            startDate: startDate || null,
            endDate: endDate || null,
            placements,
        });
    }

    const labelCls = 'mb-1 block text-sm font-medium';

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-2xl"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit ? t('ad.editTitle') : t('ad.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <BilingualField
                        label={t('ad.title')}
                        en={titleEn}
                        km={titleKm}
                        onEn={setTitleEn}
                        onKm={setTitleKm}
                    />
                    <BilingualField
                        label={t('ad.content')}
                        en={contentEn}
                        km={contentKm}
                        onEn={setContentEn}
                        onKm={setContentKm}
                        textarea
                    />

                    <AdImageField value={imageUrl} onChange={setImageUrl} />

                    <div>
                        <label className={labelCls}>{t('ad.link')}</label>
                        <Input
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="/products or https://…"
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label className={labelCls}>{t('ad.placements')}</label>
                        <div className="flex flex-wrap gap-2">
                            {PLACEMENT_LOCATIONS.map((loc) => {
                                const on = placements.includes(loc);
                                return (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => togglePlacement(loc)}
                                        className={cn(
                                            'rounded-full border px-3 py-1 text-sm transition-colors',
                                            on
                                                ? 'border-pink-400 bg-pink-50 text-pink-700 dark:border-pink-600 dark:bg-pink-500/15 dark:text-pink-300'
                                                : 'border-input text-muted-foreground hover:bg-accent',
                                        )}
                                    >
                                        {t(PLACEMENT_LABEL[loc])}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <label className={labelCls}>{t('ad.status')}</label>
                            <Select
                                value={status}
                                onValueChange={(v) =>
                                    setStatus(v as AdStatus)
                                }
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(v) => t(STATUS_LABEL[v as AdStatus])}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {AD_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {t(STATUS_LABEL[s])}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('ad.startDate')}
                            </label>
                            <DatePicker
                                value={startDate}
                                onChange={setStartDate}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('ad.endDate')}
                            </label>
                            <DatePicker
                                value={endDate}
                                onChange={setEndDate}
                            />
                        </div>
                    </div>
                </div>

                <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={pending}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {isEdit ? t('settings.saveChanges') : t('ad.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
