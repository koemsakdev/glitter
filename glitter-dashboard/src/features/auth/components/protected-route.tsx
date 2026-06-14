'use client';

/**
 * Wrap any page with <ProtectedRoute> to require login before seeing it.
 * If the user isn't logged in (or is a customer), they get redirected to /login.
 */
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    // Customers can't access the dashboard
    if (user.role === 'customer') {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  // While hydrating (checking localStorage tokens), show a spinner
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BrandedLoader size="md" />
      </div>
    );
  }

  // Not logged in → useEffect will redirect; render nothing meanwhile
  if (!user || user.role === 'customer') {
    return null;
  }

  return <>{children}</>;
}