import {
  AccountStatus,
  ProfileImageSource,
  UserRole,
} from '../entities/user.entity';
import { AuthProvider } from '../entities/auth-account.entity';

export interface UserResponse {
  id: string;
  email: string | null;
  username: string | null;
  emailVerifiedAt: Date | null;
  phoneNumber: string | null;
  phoneVerifiedAt: Date | null;
  fullName: string;
  profileImageUrl: string | null;
  profileImageSource: ProfileImageSource;
  role: UserRole;
  branchId: string | null;
  /** Permissions an admin granted on top of the role. */
  extraPermissions: string[];
  /** Everything this user may do (role defaults + extras; all for admins). */
  permissions: string[];
  branch?: {
    id: string;
    branchCode: string;
    branchNameEn: string;
    branchNameKm: string;
  };
  accountStatus: AccountStatus;
  isProfileComplete: boolean;
  missingFields: Array<'phoneNumber' | 'email' | 'fullName'>;
  linkedProviders: AuthProvider[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse {
  data: UserResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface UserDetailResponse {
  data: UserResponse;
}
