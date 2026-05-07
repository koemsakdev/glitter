'use client';

import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useDeleteBrand } from '@/features/brands/use-brands';
import { getErrorMessage } from '@/lib/api-client';
import { useI18n } from '@/lib/i18n';
import type { Brand } from '@/types/brand';

interface DeleteBrandDialogProps {
    brand: Brand | null;
    onOpenChange: (open: boolean) => void;
}

export function DeleteBrandDialog({
                                      brand,
                                      onOpenChange,
                                  }: DeleteBrandDialogProps) {
    const { t } = useI18n();
    const deleteMutation = useDeleteBrand();

    async function handleDelete() {
        if (!brand) return;
        try {
            await deleteMutation.mutateAsync(brand.id);
            toast.success(t('brand.delete.success'));
            onOpenChange(false);
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
    }

    const message = t('brand.delete.message').replace(
        '{name}',
        brand?.name ?? '',
    );

    return (
        <AlertDialog open={Boolean(brand)} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t('brand.delete.title')}</AlertDialogTitle>
                    <AlertDialogDescription>{message}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteMutation.isPending}>
                        {t('common.cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={deleteMutation.isPending}
                        className="bg-destructive text-white hover:bg-destructive/90"
                    >
                        {deleteMutation.isPending && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('brand.delete.confirm')}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}