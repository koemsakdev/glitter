'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';

type ConfirmVariant = 'danger' | 'warning' | 'info';

const VARIANT_STYLES: Record<
    ConfirmVariant,
    {
        iconBg: string;
        iconColor: string;
        barGradient: string;
        confirmBtn: string;
    }
> = {
    danger: {
        iconBg: 'bg-destructive/10',
        iconColor: 'text-destructive',
        barGradient: 'bg-linear-to-r from-red-400 via-red-300 to-red-400 dark:from-red-700 dark:via-red-600 dark:to-red-700',
        confirmBtn: 'bg-destructive text-white hover:bg-destructive/90',
    },
    warning: {
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-500 dark:text-amber-400',
        barGradient: 'bg-linear-to-r from-amber-400 via-amber-300 to-amber-400 dark:from-amber-700 dark:via-amber-600 dark:to-amber-700',
        confirmBtn: 'bg-amber-500 text-white hover:bg-amber-600',
    },
    info: {
        iconBg: 'bg-pink-500/10',
        iconColor: 'text-pink-500 dark:text-pink-300',
        barGradient: 'bg-linear-to-r from-pink-400 via-pink-300 to-pink-400 dark:from-pink-700 dark:via-pink-600 dark:to-pink-700',
        confirmBtn:
            'bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800',
    },
};

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    icon?: ReactNode;
    isPending?: boolean;
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
      open,
      onOpenChange,
      title,
      description,
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      variant = 'danger',
      icon,
      isPending = false,
      onConfirm,
  }: ConfirmDialogProps) {
    const styles = VARIANT_STYLES[variant];

    return (
        <ResponsiveModal open={open} onOpenChange={onOpenChange}>
            <div className="flex flex-col">
                {/* Header */}
                <div className="relative px-6 pb-4 pt-6">
                    <div
                        className={`absolute inset-x-0 top-0 h-1 ${styles.barGradient}`}
                    />

                    <div className="flex items-start gap-3">
                        <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
                        >
                            {icon ?? (
                                <AlertTriangle className={`size-5 ${styles.iconColor}`} />
                            )}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                            {description && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 border-t bg-neutral-50 dark:bg-neutral-800 px-6 py-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isPending}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={isPending}
                        className={styles.confirmBtn}
                    >
                        {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}