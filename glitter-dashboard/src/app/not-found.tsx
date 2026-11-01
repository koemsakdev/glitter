'use client';

import { ArrowLeft, LayoutDashboard, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

/** Dashboard 404 — any URL that doesn't match a page. */
export default function NotFound() {
    const { t } = useI18n();
    const router = useRouter();
    return (
        <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-pink-50 via-background to-pink-50/50 px-6 dark:from-pink-950/30 dark:via-background dark:to-pink-900/20">
            <div className="w-full max-w-md text-center">
                <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300">
                    <SearchX className="size-8" />
                </span>
                <p className="mt-6 text-sm font-semibold tracking-widest text-pink-600 dark:text-pink-400">
                    404
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                    {t('notFound.title')}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('notFound.body')}
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="size-4" />
                        {t('common.back')}
                    </Button>
                    <Button
                        nativeButton={false}
                        className="bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                        render={
                            <Link href="/dashboard">
                                <LayoutDashboard className="size-4" />
                                {t('notFound.home')}
                            </Link>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
