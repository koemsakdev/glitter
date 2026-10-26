/**
 * Auth API functions. These wrap the /api/auth/* endpoints.
 *
 * Note: /api/auth/me wraps the user in { data: {...} } while /api/auth/login
 * returns user directly. We unwrap /me here so the rest of the app sees a
 * consistent User shape.
 */
import { apiClient } from '@/lib/api-client';
import type { AuthTokens, LoginResponse, User } from '@/types/api';

export interface LoginDto {
  /** Staff username (an email also works for older accounts). */
  username: string;
  password: string;
  /** Device details for the security log (see lib/client-info). */
  client?: Record<string, unknown>;
}

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

// /api/auth/me wraps the user in { data: {...} }
interface GetCurrentUserResponse {
  data: User;
}

export const authApi = {
  async login(dto: LoginDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>(
        '/api/auth/staff/login',
        dto,
    );
    return data;
  },

  async register(dto: RegisterDto): Promise<LoginResponse> {
    const { data } = await apiClient.post<LoginResponse>(
        '/api/auth/register',
        dto,
    );
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const { data } = await apiClient.get<GetCurrentUserResponse>(
        '/api/auth/me',
    );
    return data.data; // unwrap the user from { data: {...} }
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout');
  },

  /** Returns fresh tokens — the old ones are revoked by the change.
   * `currentPassword` is skipped on the forced first-sign-in change. */
  async changePassword(
      currentPassword: string | undefined,
      newPassword: string,
  ): Promise<AuthTokens> {
    const { data } = await apiClient.post<{ ok: true; tokens: AuthTokens }>(
        '/api/auth/change-password',
        { currentPassword, newPassword },
    );
    return data.tokens;
  },
};