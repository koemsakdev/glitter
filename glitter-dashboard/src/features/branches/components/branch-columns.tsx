'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MapPin } from 'lucide-react';
import Link from 'next/link';
import { RowActions } from '@/components/resource/row-actions';
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
            meta: { sortKey: 'branchCode' },
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
            meta: { sortKey: 'branchNameEn' },
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
            meta: { sortKey: 'branchStatus' },
            header: () => t('branch.field.status'),
            cell: ({ row }) => <BranchStatusBadge status={row.original.branchStatus} />,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">{t('common.actions')}</span>,
            size: 60,
            cell: ({ row }) => (
                <RowActions
                    viewHref={`/dashboard/branches/${row.original.id}`}
                    editHref={`/dashboard/branches/${row.original.id}/edit`}
                    onDelete={() => onDelete(row.original)}
                    audit={{
                        entity: 'branches',
                        id: row.original.id,
                        label: row.original.branchNameEn,
                    }}
                />
            ),
        },
    ];
}