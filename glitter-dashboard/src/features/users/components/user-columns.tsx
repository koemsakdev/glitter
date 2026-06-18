'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-url';
import type { useI18n } from '@/lib/i18n';
import type { User } from '@/types/user';
import { UserRoleBadge, UserStatusBadge } from './user-badges';

type TFunction = ReturnType<typeof useI18n>['t'];

interface UserColumnsContext {
    t: TFunction;
    language: 'en' | 'km';
    showRole?: boolean;
    showBranch?: boolean;
    /** The logged-in user's id — used to hide self-destructive actions. */
    currentUserId?: string;
    onView?: (user: User) => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
}

function formatDate(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(d);
}

export function getUserColumns({
    t,
    language,
    showRole = true,
    showBranch = true,
    currentUserId,
    onView,
    onEdit,
    onDelete,
}: UserColumnsContext): ColumnDef<User>[] {
    const columns: ColumnDef<User>[] = [
        {
            accessorKey: 'fullName',
            header: t('user.col.user'),
            cell: ({ row }) => {
                const u = row.original;
                const avatar = getFileUrl(u.profileImageUrl);
                const initials = u.fullName
                    .split(' ')
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pink-100 text-xs font-semibold text-pink-700 dark:bg-pink-500/15 dark:text-pink-300">
                            {avatar ? (
                                <Image
                                    src={avatar}
                                    alt={u.fullName}
                                    width={36}
                                    height={36}
                                    className="size-full object-cover"
                                    unoptimized
                                />
                            ) : (
                                initials || '?'
                            )}
                        </div>
                        <div className="min-w-0">
                            {onView ? (
                                <button
                                    type="button"
                                    onClick={() => onView(u)}
                                    className="truncate text-left text-sm font-medium hover:text-pink-600 hover:underline dark:hover:text-pink-300"
                                >
                                    {u.fullName}
                                </button>
                            ) : (
                                <div className="truncate text-sm font-medium">
                                    {u.fullName}
                                </div>
                            )}
                            <div className="truncate text-xs text-muted-foreground">
                                {u.email ?? '—'}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: 'phoneNumber',
            header: t('user.col.phone'),
            cell: ({ row }) => (
                <span className="font-mono text-sm text-muted-foreground">
                    {row.original.phoneNumber ?? '—'}
                </span>
            ),
        },
        ...(showRole
            ? [
                  {
                      accessorKey: 'role',
                      header: t('user.col.role'),
                      cell: ({ row }) => (
                          <UserRoleBadge role={row.original.role} />
                      ),
                  } as ColumnDef<User>,
              ]
            : []),
        ...(showBranch
            ? [
                  {
                      accessorKey: 'branch',
                      header: t('user.col.branch'),
                      cell: ({ row }) => {
                          const b = row.original.branch;
                          if (!b)
                              return (
                                  <span className="text-muted-foreground">
                                      —
                                  </span>
                              );
                          return (
                              <span className="text-sm">
                                  {language === 'km'
                                      ? b.branchNameKm
                                      : b.branchNameEn}
                              </span>
                          );
                      },
                  } as ColumnDef<User>,
              ]
            : []),
        {
            accessorKey: 'accountStatus',
            header: t('user.col.status'),
            cell: ({ row }) => (
                <UserStatusBadge status={row.original.accountStatus} />
            ),
        },
        {
            accessorKey: 'createdAt',
            header: t('user.col.joined'),
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(row.original.createdAt)}
                </span>
            ),
        },
        {
            id: 'actions',
            header: '',
            cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                    {onView && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            onClick={() => onView(row.original)}
                        >
                            <Eye className="size-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(row.original)}
                    >
                        <Pencil className="size-4" />
                    </Button>
                    {row.original.id !== currentUserId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => onDelete(row.original)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return columns;
}
