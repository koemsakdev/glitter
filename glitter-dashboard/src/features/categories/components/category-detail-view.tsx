'use client';

import { format } from 'date-fns';
import { ArrowLeft, Edit, ImageIcon, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailField, DetailSection } from '@/components/feedback/detail-section';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog';
import { DeleteCategoryDialog } from '@/features/categories/components/delete-category-dialog';
import { useDeleteCategoryModal } from '@/features/categories/hooks/use-delete-category-modal';
import { useModifyCategoryModal } from '@/features/categories/hooks/use-modify-category-modal';
import { useCategory } from '@/features/categories/use-categories';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { Category, CategoryType } from '@/types/category';

interface CategoryDetailViewProps {
    id: string;
}

export function CategoryDetailView({ id }: CategoryDetailViewProps) {
    const { t, language } = useI18n();
    const { data: category, isLoading, isError, refetch } = useCategory(id);

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

    const modifyModal = useModifyCategoryModal();
    const deleteModal = useDeleteCategoryModal();

    if (isLoading) {
        return <LoadingScreen variant="page" />;
    }

    if (isError || !category) {
        return (
            <ErrorState
                title={t('category.detail.errorTitle')}
                message={t('category.detail.errorMessage')}
                onRetry={() => void refetch()}
            />
        );
    }

    const iconUrl = getFileUrl(category.iconUrl);
    const primaryName = language === 'km' ? category.nameKm : category.nameEn;
    const secondaryName = language === 'km' ? category.nameEn : category.nameKm;

    function handleEdit() {
        setEditingCategory(category!);
        modifyModal.open();
    }

    function handleDelete() {
        setDeletingCategory(category!);
        deleteModal.open();
    }

    return (
        <div className="space-y-6">
            {/* Hero */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                        {iconUrl ? (
                            <Image
                                src={iconUrl}
                                alt={primaryName}
                                width={80}
                                height={80}
                                className="size-full object-contain p-2"
                                unoptimized
                            />
                        ) : (
                            <ImageIcon className="size-8 text-muted-foreground/40" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                            {primaryName}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">{secondaryName}</p>
                        <div className="mt-2 flex items-center gap-2">
                            <CategoryTypeBadge type={category.categoryType} />
                            <span className="text-sm text-muted-foreground">·</span>
                            <span className="text-sm text-muted-foreground">
                {category.slug}
              </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 sm:shrink-0">
                    <Button
                        variant="outline"
                        nativeButton={false}
                        className="text-muted-foreground hover:text-foreground"
                        render={
                            <Link href="/dashboard/categories">
                                <ArrowLeft className="mr-2 size-4" />
                                {t('common.back')}
                            </Link>
                        }
                    />
                    <Button variant="outline" onClick={handleEdit}>
                        <Edit className="mr-2 size-4" />
                        {t('category.action.edit')}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleDelete}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Trash2 className="mr-2 size-4" />
                        {t('category.action.delete')}
                    </Button>
                </div>
            </div>

            {/* Information section */}
            <DetailSection
                title={t('category.detail.information')}
                description={t('category.detail.informationDescription')}
            >
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField label={t('category.field.nameEn')}>
                        {category.nameEn}
                    </DetailField>
                    <DetailField label={t('category.field.nameKm')}>
                        {category.nameKm}
                    </DetailField>
                    <DetailField label={t('category.field.slug')}>
            <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">
              {category.slug}
            </span>
                    </DetailField>
                    <DetailField label={t('category.field.displayOrder')}>
                        <span className="font-mono">{category.displayOrder}</span>
                    </DetailField>
                    <DetailField label={t('category.field.type')}>
                        <CategoryTypeBadge type={category.categoryType} />
                    </DetailField>
                </dl>
            </DetailSection>

            {/* Description sections — bilingual */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <DetailSection title={t('category.field.descriptionEn')}>
                    {category.descriptionEn ? (
                        <p className="text-sm leading-relaxed text-foreground">
                            {category.descriptionEn}
                        </p>
                    ) : (
                        <p className="text-sm italic text-muted-foreground">
                            {t('category.detail.noDescription')}
                        </p>
                    )}
                </DetailSection>

                <DetailSection title={t('category.field.descriptionKm')}>
                    {category.descriptionKm ? (
                        <p className="text-sm leading-relaxed text-foreground">
                            {category.descriptionKm}
                        </p>
                    ) : (
                        <p className="text-sm italic text-muted-foreground">
                            {t('category.detail.noDescription')}
                        </p>
                    )}
                </DetailSection>
            </div>

            {/* Metadata */}
            <DetailSection title={t('category.detail.metadata')}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <DetailField label={t('category.list.column.created')}>
                        {format(new Date(category.createdAt), 'PPpp')}
                    </DetailField>
                    <DetailField label={t('category.detail.updated')}>
                        {format(new Date(category.updatedAt), 'PPpp')}
                    </DetailField>
                </dl>
            </DetailSection>

            {/* Dialogs */}
            <CategoryFormDialog
                key={editingCategory?.id}
                category={editingCategory}
                onClose={() => setEditingCategory(null)}
            />
            <DeleteCategoryDialog
                category={deletingCategory}
                onClose={() => setDeletingCategory(null)}
            />
        </div>
    );
}

/**
 * Type badge — pink for main, blue for sub, amber for featured.
 */
function CategoryTypeBadge({ type }: { type: CategoryType }) {
    const styles: Record<CategoryType, { bg: string; dot: string }> = {
        main: {
            bg: 'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15',
            dot: 'bg-pink-500 dark:bg-pink-400',
        },
        sub: {
            bg: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/15',
            dot: 'bg-blue-500 dark:bg-blue-400',
        },
        featured: {
            bg: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15',
            dot: 'bg-amber-500 dark:bg-amber-400',
        },
    };

    const style = styles[type];

    return (
        <Badge className={style.bg}>
            <span className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`} />
            {type}
        </Badge>
    );
}