'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingScreen } from '@/components/feedback/loading-screen';
import { useAuthStore } from '@/stores/auth-store';

export default function RootPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    if (!isHydrated) return;
    if (user && user.role !== 'customer') {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isHydrated, user, router]);

  return <LoadingScreen variant="page" />;
}