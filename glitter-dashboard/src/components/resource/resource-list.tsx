'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    DataTable,
    DataTableEmpty,
    DataTablePagination,
    DataTableSearch,
    DataTableToolbar,
} from '@/components/data-table';
import { Button } from '@/components/ui/button';

export interface ResourceListProps<T> {
    /** Page heading + optional sub-heading. */
    title: string;
    subtitle?: string;

    /** Primary "create" action (top-right button). Omit to hide. */
    createLabel?: string;
    onCreate?: () => void;

    /** Search box (top-right of the toolbar). */
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;

    /** Filter controls rendered on the left of the toolbar. */
    filters?: ReactNode;

    /** Table data. */
    columns: ColumnDef<T, unknown>[];
    data: T[];
    isLoading?: boolean;
    isFetching?: boolean;

    /** Server-side pagination. */
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (size: number) => void;

    /** Empty-state copy. `hasActiveFilters` swaps in the "no match" title. */
    emptyTitle: string;
    emptyDescription?: string;
    emptyFilteredTitle?: string;
    hasActiveFilters?: boolean;

    /** Dialogs / modals owned by the page. */
    children?: ReactNode;
}

/**
 * Standard list screen: header + create button, filter/search toolbar,
 * data table, and server-side pagination. Keeps every management page
 * visually consistent and reduces each one to data + columns + filters.
 */
export function ResourceList<T>({
    title,
    subtitle,
    createLabel,
    onCreate,
    search,
    onSearchChange,
    searchPlaceholder,
    filters,
    columns,
    data,
    isLoading,
    isFetching,
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    emptyTitle,
    emptyDescription,
    emptyFilteredTitle,
    hasActiveFilters,
    children,
}: ResourceListProps<T>) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                            {subtitle}
                        </p>
                    )}
                </div>
                {createLabel && onCreate && (
                    <Button
                        onClick={onCreate}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800 sm:shrink-0"
                    >
                        <Plus className="mr-2 size-4" />
                        {createLabel}
                    </Button>
                )}
            </div>

            {(filters || search !== undefined) && (
                <DataTableToolbar
                    left={filters}
                    right={
                        <DataTableSearch
                            value={search}
                            onChange={onSearchChange}
                            placeholder={searchPlaceholder}
                            className="w-full sm:w-65"
                        />
                    }
                />
            )}

            <DataTable
                data={data}
                columns={columns}
                isLoading={isLoading}
                isFetching={isFetching}
                emptyState={
                    <DataTableEmpty
                        title={
                            hasActiveFilters
                                ? (emptyFilteredTitle ?? emptyTitle)
                                : emptyTitle
                        }
                        description={hasActiveFilters ? '' : emptyDescription}
                    />
                }
            />

            {!isLoading && (
                <DataTablePagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={onPageChange}
                    onPageSizeChange={onPageSizeChange}
                    disabled={isFetching}
                />
            )}

            {children}
        </div>
    );
}
