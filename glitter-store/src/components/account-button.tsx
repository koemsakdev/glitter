'use client';

import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/auth';
import { tr, type Lang } from '@/lib/locale';

export function AccountButton({ lang }: { lang: Lang }) {
    const { user } = useAuth();
    const label = user ? tr(lang, 'account') : tr(lang, 'login');
    const verified = !!(user?.emailVerifiedAt || user?.phoneVerifiedAt);

    return (
        <Link
            href={user ? '/account' : '/account/login'}
            aria-label={label}
            title={label}
            className="relative flex size-9 items-center justify-center rounded-md text-zinc-600 dark:text-zinc-300 transition-colors hover:text-(--brand)"
        >
            {user ? (
                <span className="relative">
                    <UserAvatar
                        src={user.profileImageUrl}
                        name={user.fullName}
                        className="size-7 rounded-full text-[11px]"
                    />
                    {verified && (
                        <BadgeCheck className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-white fill-[#1877f2] text-white dark:bg-zinc-950" />
                    )}
                </span>
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
