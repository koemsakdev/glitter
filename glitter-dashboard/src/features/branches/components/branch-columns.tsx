'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Edit, Eye, MapPin, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BranchStatusBadge } from './branch-status-badge';
import type { useI18n } from '@/lib/i18n';
import type { Branch } from '@/types/branch';

type TFunction = ReturnType<typeof useI18n>['t'];

interface BranchColumnsContext {
    t: TFunction;
    language: 'en' | 'km';
    onDelete: (branch: Branch) => void;
}

export function getBranchColumns({
                                     t,
                                     language,
                                     onDelete,
                                 }: BranchColumnsContext): ColumnDef<Branch>[] {
    return [
        {
            id: 'code',
            header: () => t('branch.field.code'),
            size: 140,
            cell: ({ row }) => (
                <span className="inline-block whitespace-nowrap rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {row.original.branchCode}
        </span>
            ),
        },
        {
            id: 'name',
            header: () => t('branch.field.name'),
            cell: ({ row }) => {
                const branch = row.original;
                const primary =
                    language === 'km' ? branch.branchNameKm : branch.branchNameEn;
                const secondary =
                    language === 'km' ? branch.branchNameEn : branch.branchNameKm;
                const showSecondary =
                    secondary.trim() !== '' &&
                    secondary.trim().toLowerCase() !== primary.trim().toLowerCase();

                return (
                    <div className="flex min-w-0 flex-col">
                        <Link
                            href={`/dashboard/branches/${branch.id}`}
                            className="truncate font-medium text-foreground transition-colors hover:text-pink-600 dark:hover:text-pink-300"
                        >
                            {primary}
                        </Link>
                        {showSecondary && (
                            <span className="truncate text-xs text-muted-foreground">
                {secondary}
              </span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'address',
            header: () => t('branch.field.address'),
            cell: ({ row }) => {
                const branch = row.original;
                return (
                    <div className="flex items-start gap-1.5 text-sm">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                            <p className="truncate">{branch.streetAddress}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {branch.city}
                            </p>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'phone',
            header: () => t('branch.field.phone'),
            cell: ({ row }) => (
                <span className="font-mono text-sm">{row.original.phoneNumber}</span>
            ),
        },
        {
            id: 'status',
            header: () => t('branch.field.status'),
            cell: ({ row }) => <BranchStatusBadge status={row.original.branchStatus} />,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('common.actions')}</span>,
            size: 60,
            cell: ({ row }) => {
                const branch = row.original;
                return (
                    <div className="text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                render={
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 opacity-60 transition-opacity hover:opacity-100"
                                    >
                                        <MoreHorizontal className="size-4" />
                                        <span className="sr-only">{t('common.actions')}</span>
                                    </Button>
                                }
                            />
                            <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem
                                    render={
                                        <Link href={`/dashboard/branches/${branch.id}`}>
                                            <Eye className="mr-2 size-4" />
                                            {t('branch.action.view')}
                                        </Link>
                                    }
                                />
                                <DropdownMenuItem
                                    render={
                                        <Link href={`/dashboard/branches/${branch.id}/edit`}>
                                            <Edit className="mr-2 size-4" />
                                            {t('branch.action.edit')}
                                        </Link>
                                    }
                                />
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => onDelete(branch)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="mr-2 size-4" />
                                    {t('branch.action.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}