export type EmploymentStatus = 'active' | 'inactive' | 'terminated';

export interface StaffBranchSummary {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
}

export interface Staff {
    id: string;
    branchId: string;
    branch?: StaffBranchSummary | null;
    name: string;
    role: string;
    phone: string;
    email: string;
    employmentStatus: EmploymentStatus;
    createdAt: string;
    updatedAt: string;
}

export interface StaffListResponse {
    data: Staff[];
    total: number;
    page: number;
    limit: number;
}

export interface StaffQuery {
    page?: number;
    limit?: number;
    search?: string;
    branchId?: string;
    employmentStatus?: EmploymentStatus;
}

export interface StaffFormValues {
    name: string;
    role: string;
    phone: string;
    email: string;
    branchId: string;
    employmentStatus?: EmploymentStatus;
}

export const EMPLOYMENT_STATUSES: EmploymentStatus[] = [
    'active',
    'inactive',
    'terminated',
];
