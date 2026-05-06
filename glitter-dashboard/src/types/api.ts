/**
 * TypeScript types matching the NestJS backend responses.
 */

export type UserRole =
    | 'customer'
    | 'cashier'
    | 'manager'
    | 'admin'
    | 'super_admin';

export type AccountStatus = 'active' | 'suspended' | 'banned';

export type ProfileImageSource = 'none' | 'oauth' | 'uploaded';

export interface User {
  id: string;
  email: string | null;
  emailVerifiedAt: string | null;
  phoneNumber: string | null;
  phoneVerifiedAt: string | null;
  fullName: string;
  profileImageUrl: string | null;
  profileImageSource: ProfileImageSource;
  role: UserRole;
  branchId: string | null;
  accountStatus: AccountStatus;
  isProfileComplete: boolean;
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