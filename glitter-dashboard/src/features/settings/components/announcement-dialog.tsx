'use client';

import { Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BilingualField } from '@/features/settings/components/settings-shared';
import type { Announcement } from '@/features/settings/store-config';
import { useVouchers } from '@/features/vouchers/use-vouchers';
import type { Voucher } from '@/types/voucher';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';

function newId(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now());
}

/** Build a bilingual announcement message from a promotion. */
function promoText(v: Voucher): { en: string; km: string } {
    const amount =
        v.discountType === 'percent'
            ? `${v.discountValue}%`
            : `$${v.discountValue}`;
    const minEn = v.minSpend > 0 ? ` on orders over $${v.minSpend}` : '';
    const minKm = v.minSpend > 0 ? ` សម្រាប់ការទិញលើសពី $${v.minSpend}` : '';
    const codeEn = v.code ? ` — use code ${v.code}` : '';
    const codeKm = v.code ? ` — ប្រើកូដ ${v.code}` : '';
    const freeDelivery = v.discountType === 'percent' && v.discountValue >= 100;
    if (v.appliesTo === 'delivery') {
        const baseEn = freeDelivery ? 'Free delivery' : `${amount} off delivery`;
        const baseKm = freeDelivery
            ? 'ដឹកជញ្ជូនឥតគិតថ្លៃ'
            : `បញ្ចុះថ្លៃដឹក ${amount}`;
        return { en: `${baseEn}${minEn}${codeEn}`, km: `${baseKm}${minKm}${codeKm}` };
    }
    return {
        en: `Get ${amount} off${minEn}${codeEn}`,
        km: `បញ្ចុះតម្លៃ ${amount}${minKm}${codeKm}`,
    };
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

    const { data: vouchers = [] } = useVouchers();

    const [textEn, setTextEn] = useState(item?.textEn ?? '');
    const [textKm, setTextKm] = useState(item?.textKm ?? '');
    const [enabled, setEnabled] = useState(item?.enabled ?? true);
    const [startAt, setStartAt] = useState(item?.startAt ?? '');
    const [endAt, setEndAt] = useState(item?.endAt ?? '');
    const [fromPromo, setFromPromo] = useState(item?.voucherId ?? '');
    const [customBg, setCustomBg] = useState(Boolean(item?.bgColor));
    const [bgColor, setBgColor] = useState(item?.bgColor ?? '#ec4899');
    const [dismissible, setDismissible] = useState(item?.dismissible ?? false);

    function applyPromo(id: string) {
        setFromPromo(id);
        const v = vouchers.find((x) => x.id === id);
        if (!v) return;
        const text = promoText(v);
        setTextEn(text.en);
        setTextKm(text.km);
        if (v.startAt) setStartAt(v.startAt);
        if (v.endAt) setEndAt(v.endAt);
    }

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
            voucherId: fromPromo || null,
            bgColor: customBg ? bgColor : null,
            dismissible,
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
                    {vouchers.length > 0 && (
                        <div className="space-y-1.5 rounded-lg border border-dashed p-3">
                            <label className="text-sm font-medium">
                                {t('settings.announce.fromPromo')}
                            </label>
                            <Select
                                value={fromPromo || '__none__'}
                                onValueChange={(v) => {
                                    if (v === '__none__') setFromPromo('');
                                    else if (v) applyPromo(v);
                                }}
                            >
                                <SelectTrigger className="h-11 w-full">
                                    <SelectValue>
                                        {(val: string) => {
                                            const v = vouchers.find(
                                                (x) => x.id === val,
                                            );
                                            return v
                                                ? `${v.nameEn}${v.code ? ` · ${v.code}` : ''}`
                                                : t(
                                                      'settings.announce.fromPromoNone',
                                                  );
                                        }}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">
                                        {t('settings.announce.fromPromoNone')}
                                    </SelectItem>
                                    {vouchers.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                            {v.nameEn}
                                            {v.code
                                                ? ` · ${v.code}`
                                                : ` · ${t('voucher.automatic')}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {fromPromo
                                    ? t('settings.announce.fromPromoSynced')
                                    : t('settings.announce.fromPromoDesc')}
                            </p>
                        </div>
                    )}
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
                            <DatePicker
                                value={startAt}
                                onChange={setStartAt}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                {t('settings.announce.end')}
                            </label>
                            <DatePicker value={endAt} onChange={setEndAt} />
                        </div>
                    </div>
                    {/* Background colour */}
                    <div className="space-y-2 rounded-lg border p-3">
                        <label className="flex cursor-pointer items-center gap-2">
                            <Switch
                                checked={customBg}
                                onCheckedChange={(v) => setCustomBg(Boolean(v))}
                            />
                            <span className="text-sm font-medium">
                                {t('settings.announce.customBg')}
                            </span>
                        </label>
                        {customBg && (
                            <div className="flex items-center gap-3 pl-1">
                                <input
                                    type="color"
                                    value={bgColor}
                                    onChange={(e) => setBgColor(e.target.value)}
                                    aria-label={t('settings.announce.bgColor')}
                                    className="size-10 cursor-pointer rounded-md border bg-transparent p-0.5"
                                />
                                <span
                                    className="rounded-md px-3 py-1.5 text-xs font-semibold"
                                    style={{ backgroundColor: bgColor, color: '#fff' }}
                                >
                                    {bgColor.toUpperCase()}
                                </span>
                            </div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            {t('settings.announce.bgHint')}
                        </p>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={dismissible}
                            onCheckedChange={(v) => setDismissible(Boolean(v))}
                        />
                        <span className="text-sm font-medium">
                            {t('settings.announce.dismissible')}
                        </span>
                    </label>

                    <label className="flex cursor-pointer items-center gap-2">
                        <Switch
                            checked={enabled}
                            onCheckedChange={(v) => setEnabled(Boolean(v))}
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
