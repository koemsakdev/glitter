'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
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
import { AdImageField } from '@/features/advertisements/ad-image-field';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import { useI18n, type TranslationKey } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    BANNER_PLACEMENTS,
    BANNER_STATUSES,
    type Banner,
    type BannerFormValues,
    type BannerPlacement,
    type BannerStatus,
} from '@/types/banner';

const STATUS_LABEL: Record<BannerStatus, TranslationKey> = {
    active: 'banner.status.active',
    inactive: 'banner.status.inactive',
    scheduled: 'banner.status.scheduled',
    archived: 'banner.status.archived',
};
const PLACEMENT_LABEL: Record<BannerPlacement, TranslationKey> = {
    home_hero: 'banner.placement.home_hero',
    home_secondary: 'banner.placement.home_secondary',
    category_top: 'banner.placement.category_top',
    checkout: 'banner.placement.checkout',
};

function toDateInput(value: string | null | undefined): string {
    return value ? value.slice(0, 10) : '';
}

interface BannerFormDialogProps {
    open: boolean;
    item?: Banner | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: BannerFormValues) => void;
}

export function BannerFormDialog({
    open,
    item,
    pending,
    onOpenChange,
    onSubmit,
}: BannerFormDialogProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const [imageUrl, setImageUrl] = useState(item?.imageUrl ?? '');
    const [titleEn, setTitleEn] = useState(item?.titleEn ?? '');
    const [titleKm, setTitleKm] = useState(item?.titleKm ?? '');
    const [imageAltText, setImageAltText] = useState(item?.imageAltText ?? '');
    const [linkUrl, setLinkUrl] = useState(item?.linkUrl ?? '');
    const [descriptionEn, setDescriptionEn] = useState(
        item?.descriptionEn ?? '',
    );
    const [descriptionKm, setDescriptionKm] = useState(
        item?.descriptionKm ?? '',
    );
    const [buttonLabelEn, setButtonLabelEn] = useState(
        item?.buttonLabelEn ?? '',
    );
    const [buttonLabelKm, setButtonLabelKm] = useState(
        item?.buttonLabelKm ?? '',
    );
    const [status, setStatus] = useState<BannerStatus>(item?.status ?? 'active');
    const [startDate, setStartDate] = useState(toDateInput(item?.startDate));
    const [endDate, setEndDate] = useState(toDateInput(item?.endDate));
    const [placements, setPlacements] = useState<BannerPlacement[]>(
        item?.placements ?? ['home_hero'],
    );

    function togglePlacement(loc: BannerPlacement) {
        setPlacements((prev) =>
            prev.includes(loc)
                ? prev.filter((p) => p !== loc)
                : [...prev, loc],
        );
    }

    function handleSubmit() {
        if (!imageUrl.trim()) {
            toast({ title: t('banner.required'), variant: 'destructive' });
            return;
        }
        onSubmit({
            imageUrl: imageUrl.trim(),
            // Send null (not undefined) so cleared fields are actually cleared.
            titleEn: titleEn.trim() || null,
            titleKm: titleKm.trim() || null,
            imageAltText: imageAltText.trim() || null,
            linkUrl: linkUrl.trim() || null,
            descriptionEn: descriptionEn.trim() || null,
            descriptionKm: descriptionKm.trim() || null,
            buttonLabelEn: buttonLabelEn.trim() || null,
            buttonLabelKm: buttonLabelKm.trim() || null,
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
                        {isEdit ? t('banner.editTitle') : t('banner.add')}
                    </h2>
                </div>

                <div className="space-y-4 px-6 pb-2">
                    <AdImageField value={imageUrl} onChange={setImageUrl} />

                    <BilingualField
                        label={`${t('banner.tagline')} (${t('common.optional')})`}
                        en={titleEn}
                        km={titleKm}
                        onEn={setTitleEn}
                        onKm={setTitleKm}
                        maxLength={60}
                    />

                    <BilingualField
                        label={`${t('banner.description')} (${t('common.optional')})`}
                        en={descriptionEn}
                        km={descriptionKm}
                        onEn={setDescriptionEn}
                        onKm={setDescriptionKm}
                        textarea
                        maxLength={160}
                    />

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className={labelCls}>
                                {t('banner.alt')} ({t('common.optional')})
                            </label>
                            <Input
                                value={imageAltText}
                                onChange={(e) =>
                                    setImageAltText(e.target.value)
                                }
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>{t('banner.link')}</label>
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="/products or https://…"
                                className={inputClass}
                            />
                        </div>
                    </div>

                    <div>
                        <BilingualField
                            label={`${t('banner.buttonLabel')} (${t('common.optional')})`}
                            en={buttonLabelEn}
                            km={buttonLabelKm}
                            onEn={setButtonLabelEn}
                            onKm={setButtonLabelKm}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('banner.buttonHint')}
                        </p>
                    </div>

                    <div>
                        <label className={labelCls}>
                            {t('banner.placements')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {BANNER_PLACEMENTS.map((loc) => {
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
                            <label className={labelCls}>
                                {t('banner.status')}
                            </label>
                            <Select
                                value={status}
                                onValueChange={(v) =>
                                    setStatus(v as BannerStatus)
                                }
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(v) =>
                                            t(STATUS_LABEL[v as BannerStatus])
                                        }
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {BANNER_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s}>
                                            {t(STATUS_LABEL[s])}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('banner.startDate')}
                            </label>
                            <DatePicker
                                value={startDate}
                                onChange={setStartDate}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>
                                {t('banner.endDate')}
                            </label>
                            <DatePicker value={endDate} onChange={setEndDate} />
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
                        {isEdit ? t('settings.saveChanges') : t('banner.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
