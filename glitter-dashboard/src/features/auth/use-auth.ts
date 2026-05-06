'use client';

import { useMutation } from '@tanstack/react-query';
import { authApi, type LoginDto } from '@/features/auth/auth-api';
import { authCookie } from '@/lib/auth-cookie';
import { tokenStorage } from '@/lib/token-storage';
import { useAuthStore } from '@/stores/auth-store';

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (dto: LoginDto) => authApi.login(dto),
    onSuccess: (data) => {
      tokenStorage.setTokens(data.tokens.accessToken, data.tokens.refreshToken);
      authCookie.set();
      setUser(data.user);
    },
  });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout();
      } catch {
        // Ignore backend errors — clear state regardless
      }
    },
    onSettled: () => {
      tokenStorage.clearTokens();
      authCookie.clear();
      clear();
    },
  });
}