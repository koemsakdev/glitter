'use client';

import { ResponsiveModal } from '@/components/responsive-modal';
import { BrandForm } from '@/features/brands/components/brand-form';
import { useCreateBrandModal } from '@/features/brands/hooks/use-create-brand-modal';
import { useModifyBrandModal } from '@/features/brands/hooks/use-modify-brand-modal';
import { useI18n } from '@/lib/i18n';
import type { Brand } from '@/types/brand';

interface BrandFormDialogProps {
    brand?: Brand | null;
    onClose?: () => void;
}

export function BrandFormDialog({ brand, onClose }: BrandFormDialogProps) {
    const { t } = useI18n();
    const isEditMode = Boolean(brand);

    const createModal = useCreateBrandModal();
    const modifyModal = useModifyBrandModal();

    // Use the appropriate modal hook based on mode
    const isOpen = isEditMode ? modifyModal.isOpen : createModal.isOpen;
    const setIsOpen = isEditMode
        ? modifyModal.setIsOpen
        : createModal.setIsOpen;

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) onClose?.();
    }

    return (
        <ResponsiveModal open={isOpen} onOpenChange={handleOpenChange}>
            <div className="flex flex-col">
                {/* Header */}
                <div className="relative px-6 pb-4 pt-6">
                    {/*<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-pink-300 via-accent to-pink-300 dark:from-pink-800 dark:via-accent dark:to-pink-800" />*/}
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEditMode ? t('brand.edit.title') : t('brand.create.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {isEditMode ? brand?.name : t('brand.list.subtitle')}
                    </p>
                </div>

                {/* Form */}
                <BrandForm
                    brand={brand}
                    onSuccess={() => handleOpenChange(false)}
                    onCancel={() => handleOpenChange(false)}
                />
            </div>
        </ResponsiveModal>
    );
}