'use client';

import { ResponsiveModal } from '@/components/responsive-modal';
import { CategoryForm } from '@/features/categories/components/category-form';
import { useCreateCategoryModal } from '@/features/categories/hooks/use-create-category-modal';
import { useModifyCategoryModal } from '@/features/categories/hooks/use-modify-category-modal';
import { useI18n } from '@/lib/i18n';
import type { Category } from '@/types/category';

interface CategoryFormDialogProps {
    category?: Category | null;
    onClose?: () => void;
}

export function CategoryFormDialog({
                                       category,
                                       onClose,
                                   }: CategoryFormDialogProps) {
    const { t, language } = useI18n();
    const isEditMode = Boolean(category);

    const createModal = useCreateCategoryModal();
    const modifyModal = useModifyCategoryModal();

    const isOpen = isEditMode ? modifyModal.isOpen : createModal.isOpen;
    const setIsOpen = isEditMode
        ? modifyModal.setIsOpen
        : createModal.setIsOpen;

    function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (!open) onClose?.();
    }

    const displayName = isEditMode
        ? language === 'km'
            ? category?.nameKm
            : category?.nameEn
        : t('category.list.subtitle');

    return (
        <ResponsiveModal open={isOpen} onOpenChange={handleOpenChange}>
            <div className="flex flex-col">
                <div className="relative px-6 pb-4 pt-6">
                    <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-pink-300 via-accent to-pink-300 dark:from-pink-800 dark:via-accent dark:to-pink-800" />
                    <h2 className="text-xl font-bold tracking-tight">
                        {isEditMode
                            ? t('category.edit.title')
                            : t('category.create.title')}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">{displayName}</p>
                </div>

                <CategoryForm
                    category={category}
                    onSuccess={() => handleOpenChange(false)}
                    onCancel={() => handleOpenChange(false)}
                />
            </div>
        </ResponsiveModal>
    );
}