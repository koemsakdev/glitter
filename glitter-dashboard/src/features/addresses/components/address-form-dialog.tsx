'use client';

import { ResponsiveModal } from '@/components/responsive-modal';
import { AddressForm } from '@/features/addresses/components/address-form';
import { useI18n } from '@/lib/i18n';
import type { Address } from '@/types/address';

interface AddressFormDialogProps {
    open: boolean;
    userId: string;
    address?: Address | null;
    defaultRecipientName?: string;
    defaultRecipientPhone?: string;
    onOpenChange: (open: boolean) => void;
}

export function AddressFormDialog({
    open,
    userId,
    address,
    defaultRecipientName,
    defaultRecipientPhone,
    onOpenChange,
}: AddressFormDialogProps) {
    const { t } = useI18n();
    const isEdit = Boolean(address);

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-3xl"
        >
            <div className="flex flex-col">
                <div className="px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEdit
                            ? t('address.edit.title')
                            : t('address.create.title')}
                    </h2>
                </div>
                <AddressForm
                    key={address?.id ?? 'new'}
                    userId={userId}
                    address={address}
                    defaultRecipientName={defaultRecipientName}
                    defaultRecipientPhone={defaultRecipientPhone}
                    onSuccess={() => onOpenChange(false)}
                    onCancel={() => onOpenChange(false)}
                />
            </div>
        </ResponsiveModal>
    );
}
