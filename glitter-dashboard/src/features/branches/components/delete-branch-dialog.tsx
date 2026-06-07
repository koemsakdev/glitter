'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDeleteBranch } from '@/features/branches/use-branches';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Branch } from '@/types/branch';

interface DeleteBranchDialogProps {
    branch: Branch | null;
    redirectTo?: string;
    onClose: () => void;
}

export function DeleteBranchDialog({
                                       branch,
                                       redirectTo,
                                       onClose,
                                   }: DeleteBranchDialogProps) {
    const { t, language } = useI18n();
    const { toast } = useToast();
    const router = useRouter();
    const deleteMutation = useDeleteBranch();
    const [isDeleting, setIsDeleting] = useState(false);

    const isOpen = branch !== null;
    const name = branch
        ? language === 'km'
            ? branch.branchNameKm
            : branch.branchNameEn
        : '';

    async function handleConfirm() {
        if (!branch) return;
        setIsDeleting(true);
        try {
            await deleteMutation.mutateAsync(branch.id);
            toast({
                title: t('branch.delete.success'),
                variant: 'success',
            });
            onClose();
            if (redirectTo) router.push(redirectTo);
        } catch (error) {
            toast({
                title: t('common.toast.error'),
                description: getErrorMessage(error),
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('branch.delete.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t('branch.delete.message').replace('{name}', name)}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        {t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isDeleting}
                        onClick={(e) => {
                            e.preventDefault();
                            void handleConfirm();
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {isDeleting && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {t('branch.delete.confirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}