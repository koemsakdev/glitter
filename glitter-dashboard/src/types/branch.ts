export type BranchStatus = 'active' | 'inactive' | 'closed';

export interface Branch {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
    streetAddress: string;
    city: string;
    phoneNumber: string;
    email: string | null;
    latitude: number;
    longitude: number;
    openingHours: string | null;
    branchStatus: BranchStatus;
    createdAt: string;
    updatedAt: string;
}

export interface BranchFormValues {
    /** Left out on create — the API generates it (e.g. GS-PP-001). */
    branchCode?: string;
    branchNameEn: string;
    branchNameKm: string;
    streetAddress: string;
    city: string;
    phoneNumber: string;
    email?: string | null;
    latitude: number;
    longitude: number;
    openingHours?: string | null;
    branchStatus?: BranchStatus;
}

export type BranchSortBy =
    | 'createdAt'
    | 'updatedAt'
    | 'branchNameEn'
    | 'branchCode'
    | 'branchStatus'
    | 'city';
export type BranchSortOrder = 'ASC' | 'DESC';

export interface BranchListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: BranchStatus;
    sortBy?: BranchSortBy;
    sortOrder?: BranchSortOrder;
}