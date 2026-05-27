'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
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
import { Combobox } from '@/components/ui/combobox';
import { DeleteProductDialog } from '@/features/products/components/delete-product-dialog';
import { getProductColumns } from '@/features/products/components/product-columns';
import {
    DEFAULT_PRODUCT_SORT,
    PRODUCT_SORT_OPTIONS,
    PRODUCT_STATUS_OPTIONS,
    type ProductStatusFilter,
} from '@/features/products/product-config';
import { useDeleteProductModal } from '@/features/products/hooks/use-delete-product-modal';
import { useProducts } from '@/features/products/use-products';
import { useBrandOptions } from '@/lib/hooks/use-brand-options';
import { useCategoryOptions } from '@/lib/hooks/use-category-options';
import { useI18n } from '@/lib/i18n';
import type {
    Product,
    ProductSortBy,
    ProductSortOrder,
} from '@/types/product';

export default function ProductsPage() {
    const { t, language } = useI18n();

    const deleteModal = useDeleteProductModal();

    const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

    // Filters
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
    const [brandFilter, setBrandFilter] = useState<string>('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<ProductSortBy>(
        DEFAULT_PRODUCT_SORT.sortBy,
    );
    const [sortOrder, setSortOrder] = useState<ProductSortOrder>(
        DEFAULT_PRODUCT_SORT.sortOrder,
    );

    // Data
    const { data, isLoading, isFetching } = useProducts({
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        brandId: brandFilter || undefined,
        categoryId: categoryFilter || undefined,
        sortBy,
        sortOrder,
    });

    const products = data?.data ?? [];
    const total = data?.total ?? 0;

    // Brand / category lookups for the table
    const { data: brands } = useBrandOptions();
    const { data: categories } = useCategoryOptions();

    const brandsById = useMemo(() => {
        const map = new Map();
        (brands ?? []).forEach((b) => map.set(b.id, b));
        return map;
    }, [brands]);

    const categoriesById = useMemo(() => {
        const map = new Map();
        (categories ?? []).forEach((c) => map.set(c.id, c));
        return map;
    }, [categories]);

    // Filter dropdown options
    const brandFilterOptions = useMemo(
        () => [
            { value: '', label: t('product.filter.allBrands') },
            ...(brands ?? []).map((b) => ({ value: b.id, label: b.name })),
        ],
        [brands, t],
    );

    const categoryFilterOptions = useMemo(
        () => [
            { value: '', label: t('product.filter.allCategories') },
            ...(categories ?? []).map((c) => ({
                value: c.id,
                label: language === 'km' ? c.nameKm : c.nameEn,
            })),
        ],
        [categories, language, t],
    );

    // Filter / sort option translations
    const statusOptions: FilterTabOption<ProductStatusFilter>[] = useMemo(
        () =>
            PRODUCT_STATUS_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
            })),
        [t],
    );

    const sortOptions: SortOption[] = useMemo(
        () =>
            PRODUCT_SORT_OPTIONS.map((opt) => ({
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
            getProductColumns({
                t,
                language,
                brandsById,
                categoriesById,
                onDelete: (product) => {
                    setDeletingProduct(product);
                    deleteModal.open();
                },
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t, language, brandsById, categoriesById],
    );

    // Handlers
    function handleStatusChange(value: ProductStatusFilter) {
        setStatusFilter(value);
        setPage(1);
    }
    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }
    function handleSortChange(option: SortOption) {
        setSortBy(option.sortBy as ProductSortBy);
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
                        {t('product.list.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('product.list.subtitle')}
                    </p>
                </div>
                <Button
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                    nativeButton={false}
                    render={
                        <Link href="/dashboard/products/new">
                            <Plus className="mr-2 size-4" />
                            {t('product.action.create')}
                        </Link>
                    }
                />
            </div>

            {/* Toolbar — status tabs + sort/search */}
            <DataTableToolbar
                left={
                    <DataTableFilterTabs
                        options={statusOptions}
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
                            label={t('product.sort.label')}
                        />
                        <DataTableSearch
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('product.list.search')}
                            className="w-full sm:w-65"
                        />
                    </>
                }
            />

            {/* Secondary filter row — brand + category */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-65">
                    <Combobox
                        options={brandFilterOptions}
                        value={brandFilter}
                        onChange={(v) => {
                            setBrandFilter(v);
                            setPage(1);
                        }}
                        placeholder={t('product.filter.brand')}
                        searchPlaceholder={t('product.filter.brandSearch')}
                        emptyMessage={t('product.filter.brandEmpty')}
                    />
                </div>
                <div className="sm:w-65">
                    <Combobox
                        options={categoryFilterOptions}
                        value={categoryFilter}
                        onChange={(v) => {
                            setCategoryFilter(v);
                            setPage(1);
                        }}
                        placeholder={t('product.filter.category')}
                        searchPlaceholder={t('product.filter.categorySearch')}
                        emptyMessage={t('product.filter.categoryEmpty')}
                    />
                </div>
            </div>

            {/* Table */}
            <DataTable
                data={products}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    <DataTableEmpty
                        title={t('product.list.empty')}
                        description={t('product.list.emptyHelp')}
                        action={
                            <Button
                                size="sm"
                                className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                                nativeButton={false}
                                render={
                                    <Link href="/dashboard/products/new">
                                        <Plus className="mr-2 size-4" />
                                        {t('product.action.create')}
                                    </Link>
                                }
                            />
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

            {/* Delete dialog */}
            <DeleteProductDialog
                product={deletingProduct}
                onClose={() => setDeletingProduct(null)}
            />
        </div>
    );
}