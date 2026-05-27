'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    Edit, Eye,
    ImageIcon,
    MoreHorizontal,
    Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getFileUrl } from '@/lib/file-url';
import type { useI18n } from '@/lib/i18n';
import type { Category, CategoryType } from '@/types/category';
import Link from "next/link";

interface CategoryColumnsContext {
    t: ReturnType<typeof useI18n>['t'];
    language: 'en' | 'km';
    onEdit: (category: Category) => void;
    onDelete: (category: Category) => void;
}

export function getCategoryColumns({
                                       t,
                                       language,
                                       onEdit,
                                       onDelete,
                                   }: CategoryColumnsContext): ColumnDef<Category>[] {
    return [
        {
            id: 'icon',
            header: () => t('category.field.icon'),
            size: 80,
            cell: ({ row }) => {
                const category = row.original;
                const iconUrl = getFileUrl(category.iconUrl);
                const altName =
                    language === 'km' ? category.nameKm : category.nameEn;
                return (
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                        {iconUrl ? (
                            <Image
                                src={iconUrl}
                                alt={altName}
                                width={48}
                                height={48}
                                className="size-full object-contain p-1"
                                unoptimized
                            />
                        ) : (
                            <ImageIcon className="size-5 text-muted-foreground/40" />
                        )}
                    </div>
                );
            },
        },
        {
            id: 'name',
            header: () => t('category.field.name'),
            cell: ({ row }) => {
                const category = row.original;
                // Show both names — primary in current language, secondary muted
                const primary = language === 'km' ? category.nameKm : category.nameEn;
                const secondary =
                    language === 'km' ? category.nameEn : category.nameKm;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{primary}</span>
                        <span className="text-xs text-muted-foreground">{secondary}</span>
                    </div>
                );
            },
        },
        {
            id: 'slug',
            header: () => t('category.field.slug'),
            cell: ({ row }) => (
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {row.original.slug}
        </span>
            ),
        },
        {
            id: 'displayOrder',
            header: () => t('category.field.displayOrder'),
            cell: ({ row }) => (
                <span className="text-sm font-mono text-muted-foreground">
          {row.original.displayOrder}
        </span>
            ),
        },
        {
            id: 'categoryType',
            header: () => t('category.field.type'),
            cell: ({ row }) => <CategoryTypeBadge type={row.original.categoryType} />,
        },
        {
            id: 'createdAt',
            header: () => t('category.list.column.created'),
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
          {format(new Date(row.original.createdAt), 'MMM d, yyyy')}
        </span>
            ),
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('common.actions')}</span>,
            size: 60,
            cell: ({ row }) => {
                const category = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 opacity-60 transition-opacity group-hover:opacity-100"
                                    >
                                        <MoreHorizontal className="size-4" />
                                        <span className="sr-only">{t('common.actions')}</span>
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                    render={
                                        <Link href={`/dashboard/categories/${category.id}`}>
                                            <Eye className="mr-2 size-4" />
                                            {t('category.action.view')}
                                        </Link>
                                    }
                                />
                                <DropdownMenuItem onClick={() => onEdit(category)}>
                                    <Edit className="mr-2 size-4" />
                                    {t('category.action.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete(category)}
                                    className="text-destructive focus:text-destructive cursor-pointer focus:bg-red-500/5! dark:focus:bg-red-700/5!"
                                >
                                    <Trash2 className="mr-2 size-4 text-destructive" />
                                    {t('category.action.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}

/**
 * Category type badge — pink for main, blue for sub, amber for featured.
 */
function CategoryTypeBadge({ type }: { type: CategoryType }) {
    const styles: Record<CategoryType, { bg: string; dot: string }> = {
        main: {
            bg: 'bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15',
            dot: 'bg-pink-500 dark:bg-pink-400',
        },
        sub: {
            bg: 'bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500/15',
            dot: 'bg-blue-500 dark:bg-blue-400',
        },
        featured: {
            bg: 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/15',
            dot: 'bg-amber-500 dark:bg-amber-400',
        },
    };

    const style = styles[type];

    return (
        <Badge className={style.bg}>
            <span className={`mr-1 inline-block size-1.5 rounded-full ${style.dot}`} />
            {type}
        </Badge>
    );
}