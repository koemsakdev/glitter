'use client';

import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { useDeleteBrandModal } from '@/features/brands/hooks/use-delete-brand-modal';
import { useDeleteBrand } from '@/features/brands/use-brands';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Brand } from '@/types/brand';

interface DeleteBrandDialogProps {
    brand: Brand | null;
    onClose?: () => void;
}

export function DeleteBrandDialog({
  brand,
  onClose,
}: DeleteBrandDialogProps) {
    const { t } = useI18n();
    const { isOpen, setIsOpen } = useDeleteBrandModal();
    const deleteMutation = useDeleteBrand();

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) onClose?.();
    }

    async function handleConfirm() {
        if (!brand) return;
        try {
            await deleteMutation.mutateAsync(brand.id);
            toast.success(t('brand.delete.success'));
            handleOpenChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    const description = brand
        ? t('brand.delete.message').replace('{name}', brand.name)
        : '';

    // Don't render if there's no brand to delete (edge case protection)
    if (!brand && !isOpen) return null;

    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={handleOpenChange}
            title={t('brand.delete.title')}
            description={description}
            confirmLabel={t('brand.delete.confirm')}
            cancelLabel={t('common.cancel')}
            variant="danger"
            isPending={deleteMutation.isPending}
            onConfirm={handleConfirm}
        />
    );
}