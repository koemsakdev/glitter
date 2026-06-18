'use client';

import { Loader2, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
    useCreateAddress,
    useUpdateAddress,
} from '@/features/addresses/use-addresses';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Address, AddressFormValues } from '@/types/address';

// Google-maps widget is client-only.
const MapPicker = dynamic(
    () => import('@/components/ui/map-picker').then((m) => m.MapPicker),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/40">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        ),
    },
);

// Phnom Penh fallback.
const DEFAULT_LAT = 11.5564;
const DEFAULT_LNG = 104.9282;

const inputClass =
    'h-11 shadow-none focus-visible:outline-none focus-visible:ring-0 rounded-lg focus-visible:border-pink-500 dark:focus-visible:border-pink-800';

interface AddressFormProps {
    userId: string;
    address?: Address | null;
    /** Pre-fill the recipient on a NEW address (the customer's own name/phone). */
    defaultRecipientName?: string;
    defaultRecipientPhone?: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function AddressForm({
    userId,
    address,
    defaultRecipientName,
    defaultRecipientPhone,
    onSuccess,
    onCancel,
}: AddressFormProps) {
    const { t } = useI18n();
    const { toast } = useToast();
    const isEdit = Boolean(address);

    const createAddress = useCreateAddress();
    const updateAddress = useUpdateAddress();
    const pending = createAddress.isPending || updateAddress.isPending;

    const [lat, setLat] = useState(
        address?.latitude ? Number(address.latitude) : DEFAULT_LAT,
    );
    const [lng, setLng] = useState(
        address?.longitude ? Number(address.longitude) : DEFAULT_LNG,
    );
    const [picked, setPicked] = useState(Boolean(address?.latitude));
    const [addressText, setAddressText] = useState(
        address?.streetAddress ?? '',
    );
    const [city, setCity] = useState(address?.province ?? '');
    const [recipientName, setRecipientName] = useState(
        address?.recipientName ?? defaultRecipientName ?? '',
    );
    const [recipientPhone, setRecipientPhone] = useState(
        address?.recipientPhone ?? defaultRecipientPhone ?? '',
    );
    const [label, setLabel] = useState(address?.label ?? '');
    const [note, setNote] = useState(address?.landmark ?? '');
    const [isDefault, setIsDefault] = useState(
        address?.isDefaultShipping ?? false,
    );

    function handleMapChange(
        nextLat: number,
        nextLng: number,
        nextAddress?: string,
        nextCity?: string,
    ) {
        setLat(nextLat);
        setLng(nextLng);
        setPicked(true);
        if (nextAddress) setAddressText(nextAddress);
        if (nextCity) setCity(nextCity);
    }

    function fail(messageKey: Parameters<typeof t>[0]) {
        toast({
            title: t('common.toast.error'),
            description: t(messageKey),
            variant: 'destructive',
        });
    }

    async function handleSubmit() {
        if (!picked || !addressText.trim()) {
            fail('address.validation.location');
            return;
        }
        if (!recipientName.trim()) {
            fail('address.validation.recipientName');
            return;
        }
        if (!recipientPhone.trim()) {
            fail('address.validation.recipientPhone');
            return;
        }

        const payload: AddressFormValues = {
            userId,
            label: label.trim() || undefined,
            recipientName: recipientName.trim(),
            recipientPhone: recipientPhone.trim().replace(/[\s().-]/g, ''),
            streetAddress: addressText.trim().slice(0, 500),
            province: city.trim() || undefined,
            landmark: note.trim() || undefined,
            latitude: Number(lat.toFixed(6)),
            longitude: Number(lng.toFixed(6)),
            addressType: 'shipping',
            isDefaultShipping: isDefault,
            isDefaultBilling: false,
        };

        try {
            if (isEdit && address) {
                await updateAddress.mutateAsync({ id: address.id, payload });
                toast({ title: t('address.edit.success'), variant: 'success' });
            } else {
                await createAddress.mutateAsync(payload);
                toast({
                    title: t('address.create.success'),
                    variant: 'success',
                });
            }
            onSuccess?.();
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        }
    }

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
            }}
            className="flex flex-col"
        >
            <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 pb-2">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                        {t('address.field.pickLocation')}
                    </label>
                    <MapPicker
                        latitude={lat}
                        longitude={lng}
                        onChange={handleMapChange}
                        showCurrentLocation
                        reverseOnPick
                        autoLocate={!isEdit}
                        currentLocationText={t('address.action.useCurrent')}
                        searchPlaceholder={t('address.field.searchPlace')}
                        height={300}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                        {t('address.field.selected')}
                    </label>
                    <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-pink-500" />
                        <span
                            className={
                                addressText
                                    ? ''
                                    : 'text-muted-foreground italic'
                            }
                        >
                            {addressText || t('address.field.noneSelected')}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={t('address.field.recipientName')}>
                        <Input
                            value={recipientName}
                            onChange={(e) => setRecipientName(e.target.value)}
                            placeholder="Koemsak Sovann"
                            className={inputClass}
                        />
                    </Field>
                    <Field label={t('address.field.recipientPhone')}>
                        <Input
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            placeholder="+85512345678"
                            className={inputClass}
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label={t('address.field.label')}>
                        <Input
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder="Home"
                            className={inputClass}
                        />
                    </Field>
                </div>

                <Field label={t('address.field.landmark')}>
                    <Textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Blue gate next to Angkor Market"
                        rows={2}
                    />
                </Field>

                <label className="flex cursor-pointer items-center gap-2 pt-1">
                    <Checkbox
                        checked={isDefault}
                        onCheckedChange={(v) => setIsDefault(Boolean(v))}
                    />
                    <span className="text-sm font-medium">
                        {t('address.field.defaultShipping')}
                    </span>
                </label>
            </div>

            <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                {onCancel && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel}
                        disabled={pending}
                    >
                        {t('common.cancel')}
                    </Button>
                )}
                <Button
                    type="submit"
                    disabled={pending}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                >
                    {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isEdit
                        ? t('address.edit.submit')
                        : t('address.create.submit')}
                </Button>
            </div>
        </form>
    );
}

function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
        </div>
    );
}
