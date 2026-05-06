'use client';

import { useEffect, type ReactNode } from 'react';
import { authApi } from '@/features/auth/auth-api';
import { authCookie } from '@/lib/auth-cookie';
import { tokenStorage } from '@/lib/token-storage';
import { useAuthStore } from '@/stores/auth-store';

export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!tokenStorage.hasTokens()) {
        authCookie.clear();
        if (!cancelled) setHydrated(true);
        return;
      }

      authCookie.set();

      try {
        const user = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(user);
        }
      } catch (error) {
        console.error('[AuthProvider] Failed to load current user:', error);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [setUser, setHydrated]);

  return <>{children}</>;
}