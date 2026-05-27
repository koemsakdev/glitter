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
    BRAND_FILTER_OPTIONS,
    BRAND_SORT_OPTIONS,
    DEFAULT_BRAND_SORT,
    type BrandStatusFilter,
} from '@/features/brands/brand-config';
import { getBrandColumns } from '@/features/brands/components/brand-columns';
import { BrandFormDialog } from '@/features/brands/components/brand-form-dialog';
import { DeleteBrandDialog } from '@/features/brands/components/delete-brand-dialog';
import { useCreateBrandModal } from '@/features/brands/hooks/use-create-brand-modal';
import { useDeleteBrandModal } from '@/features/brands/hooks/use-delete-brand-modal';
import { useModifyBrandModal } from '@/features/brands/hooks/use-modify-brand-modal';
import { useBrands } from '@/features/brands/use-brands';
import { useI18n } from '@/lib/i18n';
import type {
    Brand,
    BrandSortBy,
    BrandSortOrder,
} from '@/types/brand';
import {useRouter} from "next/navigation";

export default function BrandsPage() {
    const { t } = useI18n();

    const router = useRouter();

    const createModal = useCreateBrandModal();
    const modifyModal = useModifyBrandModal();
    const deleteModal = useDeleteBrandModal();

    // Selected brand (data state, not URL state)
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
    const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

    // Filters
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<BrandStatusFilter>('all');
    const [sortBy, setSortBy] = useState<BrandSortBy>(
        DEFAULT_BRAND_SORT.sortBy,
    );
    const [sortOrder, setSortOrder] = useState<BrandSortOrder>(
        DEFAULT_BRAND_SORT.sortOrder,
    );

    // Data
    const { data, isLoading, isFetching } = useBrands({
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        sortBy,
        sortOrder,
    });

    const brands = data?.data ?? [];
    const total = data?.total ?? 0;

    // Translate config options
    const filterOptions: FilterTabOption<BrandStatusFilter>[] = useMemo(
        () =>
            BRAND_FILTER_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
            })),
        [t],
    );

    const sortOptions: SortOption[] = useMemo(
        () =>
            BRAND_SORT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
                sortBy: opt.sortBy,
                sortOrder: opt.sortOrder,
            })),
        [t],
    );

    const currentSortValue = `${sortBy}-${sortOrder}`;

    // Columns — wired to open the right modals
    const columns = useMemo(
        () =>
            getBrandColumns({
                t,
                onDetail: (brand) => {
                    router.push(`brands/${brand?.id}`);
                },
                onEdit: (brand) => {
                    setEditingBrand(brand);
                    modifyModal.open();
                },
                onDelete: (brand) => {
                    setDeletingBrand(brand);
                    deleteModal.open();
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t],
    );

    // Handlers
    function handleStatusChange(value: BrandStatusFilter) {
        setStatusFilter(value);
        setPage(1);
    }

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handleSortChange(option: SortOption) {
        setSortBy(option.sortBy as BrandSortBy);
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
                        {t('brand.list.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('brand.list.subtitle')}
                    </p>
                </div>
                <Button
                    onClick={createModal.open}
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                >
                    <Plus className="mr-2 size-4" />
                    {t('brand.action.create')}
                </Button>
            </div>

            {/* Toolbar */}
            <DataTableToolbar
                left={
                    <DataTableFilterTabs
                        options={filterOptions}
                        value={statusFilter}
                        onChange={handleStatusChange}
                    />
                }
                right={
                    <>
                        <DataTableSortButton
                            options={sortOptions}
                            value={currentSortValue}
                            onChange={handleSortChange}
                            label={t('brand.sort.label')}
                        />
                        <DataTableSearch
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('brand.list.search')}
                            className="w-full sm:w-65"
                        />
                    </>
                }
            />

            {/* Table */}
            <DataTable
                data={brands}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    <DataTableEmpty
                        title={t('brand.list.empty')}
                        action={
                            <Button
                                onClick={createModal.open}
                                size="sm"
                                className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                            >
                                <Plus className="mr-2 size-4" />
                                {t('brand.action.create')}
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

            {/* Create dialog — uses useCreateBrandModal internally */}
            <BrandFormDialog brand={null} />

            {/* Edit dialog — uses useModifyBrandModal internally */}
            <BrandFormDialog
                key={editingBrand?.id}
                brand={editingBrand}
                onClose={() => setEditingBrand(null)}
            />

            {/* Delete dialog — uses useDeleteBrandModal internally */}
            <DeleteBrandDialog
                brand={deletingBrand}
                onClose={() => setDeletingBrand(null)}
            />
        </div>
    );
}