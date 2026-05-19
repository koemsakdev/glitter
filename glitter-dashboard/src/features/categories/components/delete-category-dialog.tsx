'use client';

import { ConfirmDialog } from '@/components/dialogs/confirm-dialog';
import { useDeleteCategoryModal } from '@/features/categories/hooks/use-delete-category-modal';
import { useDeleteCategory } from '@/features/categories/use-categories';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Category } from '@/types/category';
import {useToast} from "@/hooks/use-toast";

interface DeleteCategoryDialogProps {
    category: Category | null;
    onClose?: () => void;
}

export function DeleteCategoryDialog({
 category,
 onClose,
}: DeleteCategoryDialogProps) {
    const { t, language } = useI18n();
    const { isOpen, setIsOpen } = useDeleteCategoryModal();
    const deleteMutation = useDeleteCategory();
    const {toast} = useToast();

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) onClose?.();
    }

    async function handleConfirm() {
        if (!category) return;
        try {
            await deleteMutation.mutateAsync(category.id);
            toast({
                title: t('common.toast.success'),
                description: t('category.delete.success'),
                variant: 'success',
            })
            handleOpenChange(false);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive'
            })
        }
    }

    const displayName = category
        ? language === 'km'
            ? category.nameKm
            : category.nameEn
        : '';

    const description = category
        ? t('category.delete.message').replace('{name}', displayName)
        : '';

    if (!category && !isOpen) return null;

    return (
        <ConfirmDialog
            open={isOpen}
            onOpenChange={handleOpenChange}
            title={t('category.delete.title')}
            description={description}
            confirmLabel={t('category.delete.confirm')}
            cancelLabel={t('common.cancel')}
            variant="danger"
            isPending={deleteMutation.isPending}
            onConfirm={handleConfirm}
        />
    );
}