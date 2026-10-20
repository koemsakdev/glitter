import type { UserRole } from '@/types/api';

export type { UserRole };
export type AccountStatus = 'active' | 'suspended' | 'deleted';

/** Sign-in methods a user can be linked with. */
export type AuthProvider = 'email' | 'google' | 'facebook' | 'telegram';

export interface User {
    id: string;
    email: string | null;
    /** Dashboard sign-in name (staff). */
    username: string | null;
    phoneNumber: string | null;
    fullName: string;
    profileImageUrl: string | null;
    role: UserRole;
    branchId: string | null;
    branch?: {
        id: string;
        branchCode: string;
        branchNameEn: string;
        branchNameKm: string;
    };
    accountStatus: AccountStatus;
    isProfileComplete: boolean;
    /** Social / email sign-in methods linked to this account. */
    linkedProviders?: AuthProvider[];
    createdAt: string;
    updatedAt: string;
}

export interface UserListResponse {
    data: User[];
    total: number;
    page: number;
    limit: number;
}

export interface UserQuery {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    accountStatus?: AccountStatus;
    branchId?: string;
    /** Only staff-role accounts (exclude customers). */
    staffOnly?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface UserFormValues {
    fullName: string;
    username?: string;
    email?: string;
    phoneNumber?: string;
    role?: UserRole;
    branchId?: string;
    accountStatus?: AccountStatus;
    /** Initial login password — only sent when creating a staff member. */
    password?: string;
}

export const USER_ROLES: UserRole[] = [
    'customer',
    'cashier',
    'manager',
    'admin',
];

export const ACCOUNT_STATUSES: AccountStatus[] = [
    'active',
    'suspended',
    'deleted',
];

/** Dashboard roles, most access first. Customers can't use the dashboard. */
export const STAFF_ROLES: UserRole[] = ['admin', 'manager', 'cashier'];

/** Roles tied to one branch (admins work across all branches). */
export const BRANCH_ROLES: UserRole[] = ['manager', 'cashier'];
