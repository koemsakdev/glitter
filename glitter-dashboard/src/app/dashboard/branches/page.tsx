'use client';

import { Building2, Plus } from 'lucide-react';
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
import { DeleteBranchDialog } from '@/features/branches/components/delete-branch-dialog';
import { getBranchColumns } from '@/features/branches/components/branch-columns';
import {
    BRANCH_SORT_OPTIONS,
    BRANCH_STATUS_OPTIONS,
    DEFAULT_BRANCH_SORT,
    type BranchStatusFilter,
} from '@/features/branches/branch-config';
import { useBranches } from '@/features/branches/use-branches';
import { useI18n } from '@/lib/i18n';
import type {
    Branch,
    BranchSortBy,
    BranchSortOrder,
} from '@/types/branch';

export default function BranchesPage() {
    const { t, language } = useI18n();
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>('all');
    const [sortBy, setSortBy] = useState<BranchSortBy>(
        DEFAULT_BRANCH_SORT.sortBy,
    );
    const [sortOrder, setSortOrder] = useState<BranchSortOrder>(
        DEFAULT_BRANCH_SORT.sortOrder,
    );

    const { data, isLoading, isFetching } = useBranches({
        page,
        limit: pageSize,
    });

    const allBranches: Branch[] = data?.data ?? [];

    // Client-side filter + sort
    const filteredBranches = useMemo(() => {
        let result = [...allBranches];

        if (statusFilter !== 'all') {
            result = result.filter((b) => b.branchStatus === statusFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (b) =>
                    b.branchCode.toLowerCase().includes(q) ||
                    b.branchNameEn.toLowerCase().includes(q) ||
                    b.branchNameKm.toLowerCase().includes(q) ||
                    b.city.toLowerCase().includes(q),
            );
        }

        result.sort((a, b) => {
            const aVal = a[sortBy as keyof Branch];
            const bVal = b[sortBy as keyof Branch];
            if (aVal === bVal) return 0;
            const cmp = String(aVal) > String(bVal) ? 1 : -1;
            return sortOrder === 'ASC' ? cmp : -cmp;
        });

        return result;
    }, [allBranches, statusFilter, search, sortBy, sortOrder]);

    const total = filteredBranches.length;

    const statusOptions: FilterTabOption<BranchStatusFilter>[] = useMemo(
        () =>
            BRANCH_STATUS_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
            })),
        [t],
    );

    const sortOptions: SortOption[] = useMemo(
        () =>
            BRANCH_SORT_OPTIONS.map((opt) => ({
                value: opt.value,
                label: t(opt.labelKey),
                sortBy: opt.sortBy,
                sortOrder: opt.sortOrder,
            })),
        [t],
    );

    const currentSortValue = `${sortBy}-${sortOrder}`;

    const columns = useMemo(
        () =>
            getBranchColumns({
                t,
                language,
                onDelete: (branch) => setDeletingBranch(branch),
            }),
        [t, language],
    );

    function handleStatusChange(value: BranchStatusFilter) {
        setStatusFilter(value);
        setPage(1);
    }

    function handleSearchChange(value: string) {
        setSearch(value);
        setPage(1);
    }

    function handleSortChange(option: SortOption) {
        setSortBy(option.sortBy as BranchSortBy);
        setSortOrder(option.sortOrder);
        setPage(1);
    }

    function handlePageSizeChange(size: number) {
        setPageSize(size);
        setPage(1);
    }

    const hasActiveFilters = search !== '' || statusFilter !== 'all';

    function handleClearFilters() {
        setSearch('');
        setStatusFilter('all');
        setPage(1);
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {t('branch.list.title')}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        {t('branch.list.subtitle')}
                    </p>
                </div>
                <Button
                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                    nativeButton={false}
                    render={
                        <Link href="/dashboard/branches/new">
                            <Plus className="mr-2 size-4" />
                            {t('branch.action.create')}
                        </Link>
                    }
                />
            </div>

            {/* Toolbar — status tabs left, sort + search right */}
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
                            label={t('branch.sort.label')}
                        />
                        <DataTableSearch
                            value={search}
                            onChange={handleSearchChange}
                            placeholder={t('branch.list.search')}
                            className="w-full sm:w-65"
                        />
                    </>
                }
            />

            {/* Table */}
            <DataTable
                data={filteredBranches}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    hasActiveFilters ? (
                        <DataTableEmpty
                            icon={<Building2 className="size-10 text-muted-foreground/40" />}
                            title={t('branch.list.noMatch')}
                            description={t('branch.list.noMatchHelp')}
                            action={
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleClearFilters}
                                >
                                    {t('branch.list.clearFilters')}
                                </Button>
                            }
                        />
                    ) : (
                        <DataTableEmpty
                            icon={<Building2 className="size-10 text-muted-foreground/40" />}
                            title={t('branch.list.empty')}
                            description={t('branch.list.emptyHelp')}
                            action={
                                <Button
                                    size="sm"
                                    className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                                    nativeButton={false}
                                    render={
                                        <Link href="/dashboard/branches/new">
                                            <Plus className="mr-2 size-4" />
                                            {t('branch.action.create')}
                                        </Link>
                                    }
                                />
                            }
                        />
                    )
                }
            />

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

            <DeleteBranchDialog
                branch={deletingBranch}
                onClose={() => setDeletingBranch(null)}
            />
        </div>
    );
}