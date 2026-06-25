'use client';

import Link from 'next/link';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

export function AccountButton({ lang }: { lang: Lang }) {
    const { user } = useAuth();
    const label = user ? tr(lang, 'account') : tr(lang, 'login');

    return (
        <Link
            href={user ? '/account' : '/account/login'}
            aria-label={label}
            title={label}
            className="relative flex size-9 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 transition-colors hover:text-(--brand)"
        >
            {user ? (
                <UserAvatar
                    src={user.profileImageUrl}
                    name={user.fullName}
                    className="size-7 rounded-full text-[11px]"
                />
            ) : (
                <svg
                    className="size-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            )}
        </Link>
    );
}
