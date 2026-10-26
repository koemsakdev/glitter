'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrandedLoader } from '@/components/feedback/branded-loader';
import { SetPasswordForm } from '@/features/auth/components/set-password-form';
import { useAuthStore } from '@/stores/auth-store';

/** Forced first sign-in step: staff on a default/reset password pick their own. */
export default function SetPasswordPage() {
    const router = useRouter();
    const user = useAuthStore((s) => s.user);
    const isHydrated = useAuthStore((s) => s.isHydrated);

    useEffect(() => {
        if (!isHydrated) return;
        if (!user || user.role === 'customer') router.replace('/login');
        else if (!user.mustChangePassword) router.replace('/dashboard');
    }, [isHydrated, user, router]);

    if (!isHydrated || !user?.mustChangePassword) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <BrandedLoader size="md" />
            </div>
        );
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-pink-50 via-background to-pink-50/50 p-4 dark:from-pink-950/30 dark:via-background dark:to-pink-900/20">
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-pink-300/20 blur-3xl dark:bg-pink-500/10" />
            <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-pink-200/40 blur-3xl dark:bg-pink-400/10" />
            <div className="relative z-10 w-full max-w-md">
                <SetPasswordForm user={user} />
            </div>
        </div>
    );
}
