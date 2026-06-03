'use client';

import { ArrowRight, FolderTree, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-url';
import { useI18n } from '@/lib/i18n';
import type { TopCategory } from '@/types/dashboard';

interface TopCategoriesCardProps {
    categories: TopCategory[];
}

export function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
    const { t, language } = useI18n();
    const maxCount = Math.max(...categories.map((c) => c.productCount), 1);

    return (
        <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <FolderTree className="size-3.5 text-amber-600 dark:text-amber-300" />
                    <div>
                        <h2 className="text-sm font-semibold">
                            {t('dashboard.topCategories.title')}
                        </h2>
                        <p className="text-[11px] text-muted-foreground">
                            {t('dashboard.topCategories.subtitle')}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    className="h-7 text-xs text-pink-600 hover:bg-pink-50 hover:text-pink-700 dark:text-pink-300 dark:hover:bg-pink-500/15"
                    render={
                        <Link href="/dashboard/categories">
                            {t('dashboard.viewAll')}
                            <ArrowRight className="ml-1 size-3" />
                        </Link>
                    }
                />
            </div>

            {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <FolderTree className="size-7 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                        {t('dashboard.topCategories.empty')}
                    </p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {categories.map((category) => {
                        const name = language === 'km' ? category.nameKm : category.nameEn;
                        const pct = (category.productCount / maxCount) * 100;
                        const iconUrl = getFileUrl(category.iconUrl);
                        return (
                            <li key={category.id}>
                                <Link
                                    href={`/dashboard/categories/${category.id}`}
                                    className="block px-4 py-2.5 transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/40">
                                            {iconUrl ? (
                                                <Image
                                                    src={iconUrl}
                                                    alt={name}
                                                    width={32}
                                                    height={32}
                                                    className="size-full object-contain p-0.5"
                                                    unoptimized
                                                />
                                            ) : (
                                                <ImageIcon className="size-3.5 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-medium">{name}</p>
                                            <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                                                <div
                                                    className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                        <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                      {category.productCount}
                    </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}