'use client';

import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { useDeleteProductModal } from '@/features/products/hooks/use-delete-product-modal';
import { useDeleteProduct } from '@/features/products/use-products';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Product } from '@/types/product';

interface DeleteProductDialogProps {
    product: Product | null;
    /** Redirect after successful delete (e.g., back to list from detail page) */
    redirectTo?: string;
    onClose?: () => void;
}

export function DeleteProductDialog({
    product,
    redirectTo,
    onClose,
}: DeleteProductDialogProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const { isOpen, setIsOpen } = useDeleteProductModal();
    const deleteMutation = useDeleteProduct();

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) onClose?.();
    }

    async function handleConfirm() {
        if (!product) return;
        try {
            await deleteMutation.mutateAsync(product.id);
            toast({ variant: 'success', title: t('product.delete.success') });
            handleOpenChange(false);
            if (redirectTo) router.push(redirectTo);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('common.toast.error'),
                description: getErrorMessage(error),
            });
        }
    }

    const displayName = product
        ? language === 'km'
            ? product.nameKm
            : product.nameEn
        : '';

    const description = product
        ? t('product.delete.message').replace('{name}', displayName)
        : '';

    if (!product && !isOpen) return null;

    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={handleOpenChange}
            title={t('product.delete.title')}
            description={description}
            confirmLabel={t('product.delete.confirm')}
            cancelLabel={t('common.cancel')}
            variant="danger"
            isPending={deleteMutation.isPending}
            onConfirm={handleConfirm}
        />
    );
}
