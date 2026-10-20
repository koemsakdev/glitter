'use client';

import { Eye, History, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import { useAuditTrail, type AuditTarget } from '@/stores/use-audit-trail';
import type { UserRole } from '@/types/api';

/**
 * The ⋯ menu on every table row: View · Modify · Audit trail · Delete,
 * each shown only to roles allowed to use it.
 *  - View: everyone who can see the table
 *  - Modify / Delete: `manageRoles` (default: admin)
 *  - Audit trail: admin
 */
export function RowActions({
    viewHref,
    onView,
    editHref,
    onEdit,
    onDelete,
    audit,
    manageRoles = ['admin'],
    canManage: canManageProp,
    deleteLabel,
}: {
    viewHref?: string;
    onView?: () => void;
    editHref?: string;
    onEdit?: () => void;
    onDelete?: () => void;
    /** Record for the Audit trail (API record type + id). */
    audit?: AuditTarget;
    manageRoles?: UserRole[];
    /** Overrides the `manageRoles` check when the page already knows. */
    canManage?: boolean;
    deleteLabel?: string;
}) {
    const { t } = useI18n();
    const role = useAuthStore((s) => s.user?.role);
    const showTrail = useAuditTrail((s) => s.show);
    const canManage = canManageProp ?? (!!role && manageRoles.includes(role));
    const isAdmin = role === 'admin';

    const hasView = Boolean(viewHref || onView);
    const hasEdit = canManage && Boolean(editHref || onEdit);
    const hasDelete = canManage && Boolean(onDelete);
    const hasTrail = isAdmin && Boolean(audit);
    if (!hasView && !hasEdit && !hasDelete && !hasTrail) return null;

    return (
        <div className="flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-foreground"
                            aria-label={t('common.actions')}
                        >
                            <MoreHorizontal className="size-4" />
                        </Button>
                    }
                />
                <DropdownMenuContent align="end" className="w-48">
                    {hasView &&
                        (viewHref ? (
                            <DropdownMenuItem
                                render={
                                    <Link href={viewHref}>
                                        <Eye className="mr-2 size-4" />
                                        {t('rowActions.view')}
                                    </Link>
                                }
                            />
                        ) : (
                            <DropdownMenuItem onClick={onView}>
                                <Eye className="mr-2 size-4" />
                                {t('rowActions.view')}
                            </DropdownMenuItem>
                        ))}
                    {hasEdit &&
                        (editHref ? (
                            <DropdownMenuItem
                                render={
                                    <Link href={editHref}>
                                        <Pencil className="mr-2 size-4" />
                                        {t('rowActions.modify')}
                                    </Link>
                                }
                            />
                        ) : (
                            <DropdownMenuItem onClick={onEdit}>
                                <Pencil className="mr-2 size-4" />
                                {t('rowActions.modify')}
                            </DropdownMenuItem>
                        ))}
                    {hasTrail && (
                        <>
                            {(hasView || hasEdit) && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={() => showTrail(audit!)}>
                                <History className="mr-2 size-4" />
                                {t('rowActions.auditTrail')}
                            </DropdownMenuItem>
                        </>
                    )}
                    {hasDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={onDelete}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="mr-2 size-4" />
                                {deleteLabel ?? t('rowActions.delete')}
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
