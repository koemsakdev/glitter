'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/features/auth/components/login-form';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isHydrated = useAuthStore((s) => s.isHydrated);

    useEffect(() => {
        if (isHydrated && user && user.role !== 'customer') {
            router.replace('/dashboard');
        }
    }, [isHydrated, user, router]);

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-pink-50 via-background to-pink-50/50 p-4 dark:from-pink-950/30 dark:via-background dark:to-pink-900/20">
            {/* Decorative blurred orbs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-400/10" />
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pink-100/40 blur-3xl dark:bg-pink-500/5" />

            <div className="relative z-10 w-full max-w-md">
                <LoginForm />
                <p className="mt-6 text-center text-xs text-muted-foreground">
                    © 2026 Glitter Shop · All rights reserved
                </p>
            </div>
        </div>
    );
}