'use client';

import { Loader2, Plus, Save, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

/**
 * Shared frame for the checkout settings forms (shipping region, delivery
 * option): title on top, a scrolling body, and a Save / Cancel bar that
 * always stays in view (fits the 85vh modal / the phone bottom sheet).
 */
export function CheckoutFormShell({
    open,
    onOpenChange,
    title,
    subtitle,
    isEdit,
    saving,
    onSave,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    subtitle?: string;
    isEdit: boolean;
    saving: boolean;
    onSave: () => void;
    children: ReactNode;
}) {
    const { t } = useI18n();
    return (
        <ResponsiveModal
            open={open}
            onOpenChange={(o) => !saving && onOpenChange(o)}
            className="sm:max-w-lg"
        >
            <div className="flex max-h-[calc(100dvh-7.5rem)] flex-col min-[1027px]:max-h-[85vh]">
                <div className="border-b px-6 pb-4 pt-6">
                    <h2 className="text-xl font-bold tracking-tight">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {subtitle}
                        </p>
                    )}
                </div>
                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                    {children}
                </div>
                <div className="flex justify-end gap-2 border-t bg-neutral-50 px-6 py-4 dark:bg-neutral-800">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={saving}
                        onClick={() => onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="min-w-32 bg-pink-400 text-white hover:bg-pink-500 dark:bg-pink-700 dark:text-pink-200 dark:hover:bg-pink-800"
                    >
                        {saving ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : isEdit ? (
                            <Save className="size-4" />
                        ) : (
                            <Plus className="size-4" />
                        )}
                        {saving
                            ? t('common.saving')
                            : t('settings.saveChanges')}
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}

/** A labelled group inside the form. */
export function FormGroup({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="space-y-2">
            <div>
                <p className="text-sm font-medium">{label}</p>
                {hint && (
                    <p className="text-xs text-muted-foreground">{hint}</p>
                )}
            </div>
            {children}
        </div>
    );
}

/** One tappable option card in a radio group. */
export function ChoiceCard({
    active,
    onClick,
    icon: Icon,
    title,
    description,
}: {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    title: string;
    description?: string;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={active}
            onClick={onClick}
            className={cn(
                'flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all',
                active
                    ? 'border-pink-400 bg-pink-50/60 ring-1 ring-pink-400 dark:border-pink-700 dark:bg-pink-500/10 dark:ring-pink-700'
                    : 'hover:border-foreground/20 hover:bg-muted/40',
            )}
        >
            <span
                className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg',
                    active
                        ? 'bg-pink-500 text-white dark:bg-pink-700'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <Icon className="size-4" />
            </span>
            <span className="min-w-0">
                <span className="block text-sm font-semibold">{title}</span>
                {description && (
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                        {description}
                    </span>
                )}
            </span>
        </button>
    );
}
