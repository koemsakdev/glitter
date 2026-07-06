'use client';

import { Loader2, Plus, Save } from 'lucide-react';
import { useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    BilingualField,
    inputClass,
} from '@/features/settings/components/settings-shared';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type {
    DiscountTarget,
    DiscountType,
    Voucher,
    VoucherFormValues,
} from '@/types/voucher';

interface Props {
    open: boolean;
    item?: Voucher | null;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: VoucherFormValues) => void;
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}

export function VoucherFormDialog({
    open,
    item,
    pending,
    onOpenChange,
    onSubmit,
}: Props) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(item);

    const [nameEn, setNameEn] = useState(item?.nameEn ?? '');
    const [nameKm, setNameKm] = useState(item?.nameKm ?? '');
    const [code, setCode] = useState(item?.code ?? '');
    const [discountType, setDiscountType] = useState<DiscountType>(
        item?.discountType ?? 'percent',
    );
    const [appliesTo, setAppliesTo] = useState<DiscountTarget>(
        item?.appliesTo ?? 'order',
    );
    const [discountValue, setDiscountValue] = useState(
        item ? String(item.discountValue) : '',
    );
    const [minSpend, setMinSpend] = useState(
        item?.minSpend ? String(item.minSpend) : '',
    );
    const [maxDiscount, setMaxDiscount] = useState(
        item?.maxDiscount && item.maxDiscount > 0
            ? String(item.maxDiscount)
            : '',
    );
    const [startAt, setStartAt] = useState(item?.startAt ?? '');
    const [endAt, setEndAt] = useState(item?.endAt ?? '');
    const [usageLimit, setUsageLimit] = useState(
        item?.usageLimit != null ? String(item.usageLimit) : '',
    );
    const [firstOrderOnly, setFirstOrderOnly] = useState(
        item?.firstOrderOnly ?? false,
    );
    const [newAccountDays, setNewAccountDays] = useState(
        item?.newAccountDays != null ? String(item.newAccountDays) : '',
    );
    const [active, setActive] = useState(item?.active ?? true);

    function handleSubmit() {
        const value = Number(discountValue);
        if (!nameEn.trim() || !discountValue || value <= 0) {
            toast({ title: t('voucher.required'), variant: 'destructive' });
            return;
        }
        if (discountType === 'percent' && value > 100) {
            toast({ title: t('voucher.percentMax'), variant: 'destructive' });
            return;
        }
        onSubmit({
            code: code.trim() ? code.trim().toUpperCase() : null,
            nameEn: nameEn.trim(),
            nameKm: nameKm.trim(),
            discountType,
            appliesTo,
            discountValue: value,
            minSpend: Number(minSpend) || 0,
            maxDiscount:
                discountType === 'percent' && maxDiscount
                    ? Number(maxDiscount)
                    : null,
            startAt: startAt || null,
            endAt: endAt || null,
            usageLimit: usageLimit ? Number(usageLimit) : null,
            firstOrderOnly,
            newAccountDays: newAccountDays ? Number(newAccountDays) : null,
            active,
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
                        {isEdit ? t('voucher.editTitle') : t('voucher.add')}
                    </h2>
                </div>

                <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 pb-2">
                    <BilingualField
                        label={t('voucher.name')}
                        en={nameEn}
                        km={nameKm}
                        onEn={setNameEn}
                        onKm={setNameKm}
                    />

                    <Field label={t('voucher.code')}>
                        <Input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder={t('voucher.codePlaceholder')}
                            className={cn(inputClass, 'font-mono uppercase')}
                            maxLength={40}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('voucher.codeHint')}
                        </p>
                    </Field>

                    {/* Applies-to toggle */}
                    <Field label={t('voucher.appliesTo')}>
                        <div className="grid grid-cols-2 gap-2">
                            {(['order', 'delivery'] as DiscountTarget[]).map(
                                (opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setAppliesTo(opt)}
                                        className={cn(
                                            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                                            appliesTo === opt
                                                ? 'border-pink-500 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300'
                                                : 'border-input text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {opt === 'order'
                                            ? t('voucher.appliesOrder')
                                            : t('voucher.appliesDelivery')}
                                    </button>
                                ),
                            )}
                        </div>
                        {appliesTo === 'delivery' && (
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('voucher.deliveryHint')}
                            </p>
                        )}
                    </Field>

                    {/* Discount type toggle */}
                    <Field label={t('voucher.type')}>
                        <div className="grid grid-cols-2 gap-2">
                            {(['percent', 'fixed'] as DiscountType[]).map(
                                (opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setDiscountType(opt)}
                                        className={cn(
                                            'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                                            discountType === opt
                                                ? 'border-pink-500 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300'
                                                : 'border-input text-muted-foreground hover:bg-muted',
                                        )}
                                    >
                                        {opt === 'percent'
                                            ? t('voucher.percent')
                                            : t('voucher.fixed')}
                                    </button>
                                ),
                            )}
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field
                            label={
                                discountType === 'percent'
                                    ? t('voucher.valuePercent')
                                    : t('voucher.valueFixed')
                            }
                        >
                            <Input
                                type="number"
                                min={0}
                                value={discountValue}
                                onChange={(e) =>
                                    setDiscountValue(e.target.value)
                                }
                                placeholder={
                                    discountType === 'percent' ? '45' : '5'
                                }
                                className={inputClass}
                            />
                        </Field>
                        {discountType === 'percent' && (
                            <Field label={t('voucher.maxDiscount')}>
                                <Input
                                    type="number"
                                    min={0}
                                    value={maxDiscount}
                                    onChange={(e) =>
                                        setMaxDiscount(e.target.value)
                                    }
                                    placeholder={t('voucher.noCap')}
                                    className={inputClass}
                                />
                            </Field>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('voucher.minSpend')}>
                            <Input
                                type="number"
                                min={0}
                                value={minSpend}
                                onChange={(e) => setMinSpend(e.target.value)}
                                placeholder="0"
                                className={inputClass}
                            />
                        </Field>
                        <Field label={t('voucher.usageLimit')}>
                            <Input
                                type="number"
                                min={1}
                                value={usageLimit}
                                onChange={(e) => setUsageLimit(e.target.value)}
                                placeholder={t('voucher.unlimited')}
                                className={inputClass}
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label={t('voucher.startDate')}>
                            <DatePicker
                                value={startAt}
                                onChange={setStartAt}
                            />
                        </Field>
                        <Field label={t('voucher.endDate')}>
                            <DatePicker value={endAt} onChange={setEndAt} />
                        </Field>
                    </div>

                    {/* Customer eligibility */}
                    <div className="space-y-3 rounded-lg border border-dashed p-3">
                        <p className="text-sm font-medium">
                            {t('voucher.eligibility')}
                        </p>
                        <label className="flex cursor-pointer items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                                {t('voucher.firstOrderOnly')}
                            </span>
                            <Switch
                                checked={firstOrderOnly}
                                onCheckedChange={(v) =>
                                    setFirstOrderOnly(Boolean(v))
                                }
                            />
                        </label>
                        <Field label={t('voucher.newAccountDays')}>
                            <Input
                                type="number"
                                min={1}
                                value={newAccountDays}
                                onChange={(e) =>
                                    setNewAccountDays(e.target.value)
                                }
                                placeholder={t('voucher.anyAge')}
                                className={inputClass}
                            />
                        </Field>
                        {(firstOrderOnly || newAccountDays) && (
                            <p className="text-xs text-muted-foreground">
                                {t('voucher.eligibilityHint')}
                            </p>
                        )}
                    </div>

                    <label className="flex cursor-pointer items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">
                            {t('voucher.active')}
                        </span>
                        <Switch
                            checked={active}
                            onCheckedChange={(v) => setActive(Boolean(v))}
                        />
                    </label>
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
                        {isEdit ? t('settings.saveChanges') : t('voucher.add')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
