'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DataTable,
    DataTableEmpty,
    DataTableFilterTabs,
    DataTablePagination,
    DataTableSearch,
    DataTableSortButton,
    DataTableToolbar,
} from '@/components/data-table';
import type { FilterTabOption, SortOption } from '@/components/data-table';
import { Button } from '@/components/ui/button';
import {
    CATEGORY_FILTER_OPTIONS,
    CATEGORY_SORT_OPTIONS,
    DEFAULT_CATEGORY_SORT,
    type CategoryTypeFilter,
} from '@/features/categories/category-config';
import { getCategoryColumns } from '@/features/categories/components/category-columns';
import { CategoryFormDialog } from '@/features/categories/components/category-form-dialog';
import { DeleteCategoryDialog } from '@/features/categories/components/delete-category-dialog';
import { useCreateCategoryModal } from '@/features/categories/hooks/use-create-category-modal';
import { useDeleteCategoryModal } from '@/features/categories/hooks/use-delete-category-modal';
import { useModifyCategoryModal } from '@/features/categories/hooks/use-modify-category-modal';
import { useCategories } from '@/features/categories/use-categories';
import { useI18n } from '@/lib/i18n';
import type {
    Category,
    CategorySortBy,
    CategorySortOrder,
} from '@/types/category';

export default function CategoriesPage() {
    const { t, language } = useI18n();

    // Modal hooks
    const createModal = useCreateCategoryModal();
    const modifyModal = useModifyCategoryModal();
    const deleteModal = useDeleteCategoryModal();

    // Selected category
    const [editingCategory, setEditingCategory] = useState<Category | null>(
        null,
    );
    const [deletingCategory, setDeletingCategory] = useState<Category | null>(
        null,
    );

    // Filters
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>('all');
    const [sortBy, setSortBy] = useState<CategorySortBy>(
        DEFAULT_CATEGORY_SORT.sortBy,
    );
    const [sortOrder, setSortOrder] = useState<CategorySortOrder>(
        DEFAULT_CATEGORY_SORT.sortOrder,
    );

    // Data
    const { data, isLoading, isFetching } = useCategories({
        page,
        limit: pageSize,
        search: search || undefined,
        categoryType: typeFilter === 'all' ? undefined : typeFilter,
        sortBy,
        sortOrder,
    });

    const categories = data?.data ?? [];
    const total = data?.total ?? 0;

    // Translated options
    const filterOptions: FilterTabOption<CategoryTypeFilter>[] = useMemo(
        () =>
            CATEGORY_FILTER_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
            })),
        [t],
    );

    const sortOptions: SortOption[] = useMemo(
        () =>
            CATEGORY_SORT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
                sortBy: opt.sortBy,
                sortOrder: opt.sortOrder,
            })),
        [t],
    );

    const currentSortValue = `${sortBy}-${sortOrder}`;

    // Columns
    const columns = useMemo(
        () =>
            getCategoryColumns({
                t,
                language,
                onEdit: (category) => {
                    setEditingCategory(category);
                    modifyModal.open();
                },
                onDelete: (category) => {
                    setDeletingCategory(category);
                    deleteModal.open();
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t, language],
    );

    // Handlers
    function handleTypeChange(value: CategoryTypeFilter) {
        setTypeFilter(value);
        setPage(1);
    }

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handleSortChange(option: SortOption) {
        setSortBy(option.sortBy as CategorySortBy);
        setSortOrder(option.sortOrder);
        setPage(1);
    }

    function handlePageSizeChange(size: number) {
        setPageSize(size);
        setPage(1);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('category.list.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('category.list.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={createModal.open}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                >
                    <Plus className="mr-2 size-4" />
                    {t('category.action.create')}
                </Button>
            </div>

            {/* Toolbar */}
            <DataTableToolbar
                left={
                    <DataTableFilterTabs
                        options={filterOptions}
                        value={typeFilter}
                        onChange={handleTypeChange}
                    />
                }
                right={
                    <>
                        <DataTableSortButton
                            options={sortOptions}
                            value={currentSortValue}
                            onChange={handleSortChange}
                            label={t('category.sort.label')}
                        />
                        <DataTableSearch
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('category.list.search')}
                            className="w-full sm:w-65"
                        />
                    </>
                }
            />

            {/* Table */}
            <DataTable
                data={categories}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    <DataTableEmpty
                        title={t('category.list.empty')}
                        action={
                            <Button
                                onClick={createModal.open}
                                size="sm"
                                className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                            >
                                <Plus className="mr-2 size-4" />
                                {t('category.action.create')}
                            </Button>
                        }
                    />
                }
            />

            {/* Pagination */}
            {!isLoading && (
                <DataTablePagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={handlePageSizeChange}
                    disabled={isFetching}
                />
            )}

            {/* Create dialog */}
            <CategoryFormDialog category={null} />

            {/* Edit dialog */}
            <CategoryFormDialog
                key={editingCategory?.id}
                category={editingCategory}
                onClose={() => setEditingCategory(null)}
            />

            {/* Delete dialog */}
            <DeleteCategoryDialog
                category={deletingCategory}
                onClose={() => setDeletingCategory(null)}
            />
        </div>
    );
}