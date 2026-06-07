import type { TranslationKey } from '@/lib/i18n';
import type {
    BranchSortBy,
    BranchSortOrder,
    BranchStatus,
} from '@/types/branch';

export type BranchStatusFilter = 'all' | BranchStatus;

export interface BranchStatusOption {
    value: BranchStatusFilter;
    labelKey: TranslationKey;
}

export const BRANCH_STATUS_OPTIONS: BranchStatusOption[] = [
    { value: 'all', labelKey: 'branch.status.all' },
    { value: 'active', labelKey: 'branch.status.active' },
    { value: 'inactive', labelKey: 'branch.status.inactive' },
    { value: 'closed', labelKey: 'branch.status.closed' },
];

export interface BranchSortOption {
    value: string;
    labelKey: TranslationKey;
    sortBy: BranchSortBy;
    sortOrder: BranchSortOrder;
}

export const BRANCH_SORT_OPTIONS: BranchSortOption[] = [
    {
        value: 'createdAt-DESC',
        labelKey: 'branch.sort.newest',
        sortBy: 'createdAt',
        sortOrder: 'DESC',
    },
    {
        value: 'createdAt-ASC',
        labelKey: 'branch.sort.oldest',
        sortBy: 'createdAt',
        sortOrder: 'ASC',
    },
    {
        value: 'branchNameEn-ASC',
        labelKey: 'branch.sort.nameAZ',
        sortBy: 'branchNameEn',
        sortOrder: 'ASC',
    },
    {
        value: 'branchNameEn-DESC',
        labelKey: 'branch.sort.nameZA',
        sortBy: 'branchNameEn',
        sortOrder: 'DESC',
    },
    {
        value: 'updatedAt-DESC',
        labelKey: 'branch.sort.recentlyUpdated',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
    },
];

export const DEFAULT_BRANCH_SORT: {
    sortBy: BranchSortBy;
    sortOrder: BranchSortOrder;
} = {
    sortBy: 'createdAt',
    sortOrder: 'DESC',
};