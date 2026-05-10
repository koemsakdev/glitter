import type { ColumnDef } from '@tanstack/react-table';

export type DataTableColumn<TData> = ColumnDef<TData>;

export interface FilterTabOption<TValue extends string = string> {
    value: TValue;
    label: string;
}

export interface SortOption<TValue extends string = string> {
    value: TValue;
    label: string;
    sortBy: string;
    sortOrder: 'ASC' | 'DESC';
}

export interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
}