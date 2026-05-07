'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { authApi } from '@/features/auth/auth-api';
import { authCookie } from '@/lib/auth-cookie';
import { tokenStorage } from '@/lib/token-storage';
import { useAuthStore } from '@/stores/auth-store';

const PROTECTED_PREFIX = '/dashboard';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const setHydrated = useAuthStore((s) => s.setHydrated);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const onProtectedRoute =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith(PROTECTED_PREFIX);

      // No tokens at all
      if (!tokenStorage.hasTokens()) {
        authCookie.clear();
        if (!cancelled) {
          setHydrated(true);
          if (onProtectedRoute) {
            router.replace('/login');
          }
        }
        return;
      }

      // Tokens exist — keep cookie in sync
      authCookie.set();

      try {
        const user = await authApi.getCurrentUser();
        if (!cancelled) {
          setUser(user);
        }
      } catch (error) {
        // /me failed AND refresh failed (interceptor would have caught a fixable 401)
        // Means the session is dead. Clean up + redirect.
        console.error('[AuthProvider] Session expired:', error);
        if (!cancelled) {
          tokenStorage.clearTokens();
          authCookie.clear();
          setUser(null);
          if (onProtectedRoute) {
            router.replace('/login');
          }
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
  }, [setUser, setHydrated, router]);

  return <>{children}</>;
}