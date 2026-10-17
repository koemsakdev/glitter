'use client';

/**
 * Wrap any page with <ProtectedRoute> to require login before seeing it.
 * If the user isn't logged in (or is a customer), they get redirected to /login.
 * Staff opening a page their role can't use (e.g. typing the URL) are sent to
 * the first page they can — the menu already hides those pages.
 */
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { canAccessPath, homePathForRole } from '@/config/navigation';
import { useAuthStore } from '@/stores/auth-store';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
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
      return;
    }
    if (!canAccessPath(user.role, pathname)) {
      router.replace(homePathForRole(user.role));
    }
  }, [isHydrated, user, router, pathname]);

  // While hydrating (checking localStorage tokens), show a spinner
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <BrandedLoader size="md" />
      </div>
    );
  }

  // Not logged in → useEffect will redirect; render nothing meanwhile
  if (
    !user ||
    user.role === 'customer' ||
    !canAccessPath(user.role, pathname)
  ) {
    return null;
  }

  return <>{children}</>;
}