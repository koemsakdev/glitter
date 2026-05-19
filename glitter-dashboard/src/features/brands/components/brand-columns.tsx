'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    Edit,
    ImageIcon, LinkIcon,
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
import type { Brand } from '@/types/brand';
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";
import Link from "next/link";

interface BrandColumnsContext {
    t: ReturnType<typeof useI18n>['t'];
    onEdit: (brand: Brand) => void;
    onDelete: (brand: Brand) => void;
}

export function getBrandColumns({
    t,
    onEdit,
    onDelete,
}: BrandColumnsContext): ColumnDef<Brand>[] {
    return [
        {
            id: 'logo',
            header: () => t('brand.field.logo'),
            size: 80,
            cell: ({ row }) => {
                const brand = row.original;
                const logoUrl = getFileUrl(brand.logoUrl);
                return (
                    <div className="flex size-12 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/40 ring-1 ring-pink-200/30 dark:ring-pink-400/15">
                        {logoUrl ? (
                            <Image
                                src={logoUrl}
                                alt={brand.name}
                                width={48}
                                height={48}
                                className="size-full object-contain p-1 rounded-lg"
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
            header: () => t('brand.list.column.name'),
            cell: ({ row }) => {
                const brand = row.original;
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-foreground">{brand.name}</span>
                        <span className="text-xs text-muted-foreground md:hidden">
                          {brand.slug}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'slug',
            header: () => t('brand.list.column.slug'),
            cell: ({ row }) => (
                <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {row.original.slug}
                </span>
            ),
        },
        {
            id: 'website',
            header: () => t('brand.list.column.website'),
            cell: ({ row }) => {
                const url = row.original.websiteUrl;
                if (!url) return <span className="text-sm text-muted-foreground">N/A</span>;
                return (
                    <Tooltip>
                        <TooltipTrigger>
                            <Link
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-50 items-center gap-1 text-sm text-blue-600 hover:underline dark:text-blue-500"
                            >
                                <span className="truncate">
                                  {url.replace(/^https?:\/\//, "")}
                                </span>
                                <LinkIcon className="size-3 shrink-0" />
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{url}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            },
        },
        {
            id: 'status',
            header: () => t('brand.list.column.status'),
            cell: ({ row }) => {
                const status = row.original.status;
                if (status === 'active') {
                    return (
                        <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-100 dark:bg-pink-500/15 dark:text-pink-300 dark:hover:bg-pink-500/15">
                            <span className="mr-1 inline-block size-1.5 rounded-full bg-pink-500 dark:bg-pink-400" />
                            {t('brand.status.active')}
                        </Badge>
                    );
                }
                return (
                    <Badge variant="secondary" className="text-muted-foreground">
                        <span className="mr-1 inline-block size-1.5 rounded-full bg-muted-foreground" />
                        {t('brand.status.inactive')}
                    </Badge>
                );
            },
        },
        {
            id: 'createdAt',
            header: () => t('brand.list.column.created'),
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
                const brand = row.original;
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
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(brand)}>
                                    <Edit className="mr-2 size-4" />
                                    {t('brand.action.edit')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete(brand)}
                                    className="text-destructive focus:text-destructive cursor-pointer focus:bg-red-500/5! dark:focus:bg-red-700/5!"
                                >
                                    <Trash2 className="mr-2 size-4 text-red-500 text-destructive" />
                                    {t('brand.action.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}