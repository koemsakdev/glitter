/**
 * TypeScript types matching the NestJS backend responses.
 */

/** customer = storefront only; cashier/manager/admin = dashboard staff. */
export type UserRole = 'customer' | 'cashier' | 'manager' | 'admin';

export type AccountStatus = 'active' | 'suspended' | 'deleted';

export type ProfileImageSource = 'none' | 'oauth' | 'uploaded';

export interface User {
  id: string;
  email: string | null;
  /** Dashboard sign-in name (staff). */
  username?: string | null;
  emailVerifiedAt: string | null;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  fullName: string;
  profileImageUrl: string | null;
  profileImageSource: ProfileImageSource;
  role: UserRole;
  branchId: string | null;
  /** The assigned branch (managers/cashiers). */
  branch?: {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
  };
  /** Permissions an admin granted on top of the role. */
  extraPermissions?: string[];
  /** Everything the user may do (role defaults + extras; all for admins). */
  permissions?: string[];
  accountStatus: AccountStatus;
  isProfileComplete: boolean;
  /** Signed in with a default/reset password — must set a new one first. */
  mustChangePassword?: boolean;
  missingFields?: string[];
  linkedProviders?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  tokens: AuthTokens;
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}