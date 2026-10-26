'use client';

import { toast as sonner } from 'sonner';
import {
    BellRing,
    CheckCircle2,
    Info,
    Loader2,
    TriangleAlert,
    X,
    XCircle,
    type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type ToastVariant =
    'default' | 'destructive' | 'success' | 'info' | 'warning' | 'loading';

interface AppToastOptions {
    variant?: ToastVariant;
    title: string;
    description?: string;
    duration?: number;
    /** Reuse an id to replace a toast in place (e.g. loading → success). */
    id?: string | number;
    /**
     * Success toasts are skipped by default — the screen already shows the
     * result (row gone, form closed, value changed). Set this for outcomes
     * the user can't see happen (password changed, order created…).
     */
    important?: boolean;
}

const STYLES: Record<
    ToastVariant,
    {
        icon: LucideIcon;
        chip: string;
        bar: string;
        tint: string;
        role: 'status' | 'alert';
    }
> = {
    default: {
        icon: BellRing,
        chip: 'bg-pink-500/10 text-pink-600 dark:text-pink-300',
        bar: 'bg-pink-500',
        tint: 'text-pink-500',
        role: 'status',
    },
    success: {
        icon: CheckCircle2,
        chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        tint: 'text-emerald-500',
        role: 'status',
    },
    destructive: {
        icon: XCircle,
        chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        bar: 'bg-rose-500',
        tint: 'text-rose-500',
        role: 'alert',
    },
    warning: {
        icon: TriangleAlert,
        chip: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        tint: 'text-amber-500',
        role: 'alert',
    },
    info: {
        icon: Info,
        chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        bar: 'bg-sky-500',
        tint: 'text-sky-500',
        role: 'status',
    },
    loading: {
        icon: Loader2,
        chip: 'bg-pink-500/10 text-pink-600 dark:text-pink-300',
        bar: 'bg-pink-500',
        tint: 'text-pink-500',
        role: 'status',
    },
};

/** One toast: a compact card with a coloured icon, title and message. */
function AppToast({
    id,
    variant,
    title,
    description,
}: {
    id: string | number;
    variant: ToastVariant;
    title: string;
    description?: string;
    duration: number;
}) {
    const s = STYLES[variant];
    const Icon = s.icon;
    return (
        <div
            role={s.role}
            className="group flex w-[340px] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl border border-border/70 bg-popover px-3.5 py-3 text-popover-foreground shadow-[0_8px_30px_-6px_rgba(0,0,0,0.18)] dark:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6)]"
        >
            <Icon
                className={cn(
                    'mt-px size-[18px] shrink-0',
                    s.icon === Loader2 && 'animate-spin',
                    s.tint,
                )}
            />
            <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-5">{title}</p>
                {description && (
                    <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {variant !== 'loading' && (
                <button
                    type="button"
                    onClick={() => sonner.dismiss(id)}
                    aria-label="Close"
                    className="-mr-1 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                >
                    <X className="size-3.5" />
                </button>
            )}
        </div>
    );
}

export function useToast() {
    const { t } = useI18n();

    const show = ({
        variant = 'default',
        title,
        description,
        duration,
        id,
        important = false,
    }: AppToastOptions) => {
        // Quiet by default for routine successes (see `important`). If this
        // was meant to replace a loading toast, just clear that one.
        if (variant === 'success' && !important) {
            if (id !== undefined) sonner.dismiss(id);
            return id ?? '';
        }
        // Errors stay a little longer so they can be read.
        const ms =
            duration ??
            (variant === 'loading'
                ? Infinity
                : variant === 'destructive'
                  ? 6000
                  : 4000);
        return sonner.custom(
            (toastId) => (
                <AppToast
                    id={toastId}
                    variant={variant}
                    title={title}
                    description={description}
                    duration={ms}
                />
            ),
            // Only pass `id` when replacing a toast: sonner spreads these
            // options over its own id, so `id: undefined` would give the toast
            // a different id from the one returned (dismiss/close then miss it).
            id === undefined ? { duration: ms } : { duration: ms, id },
        );
    };

    /** A spinner toast that stays until replaced (pass its id) or dismissed. */
    const loading = (title: string, description?: string) =>
        show({ variant: 'loading', title, description });

    const apiError = (err: unknown) => {
        const e = err as {
            response?: { data?: { message?: string | string[] } };
            message?: string;
        };
        const raw = e?.response?.data?.message ?? e?.message;
        show({
            variant: 'destructive',
            title: t('common.toast.error'),
            description: Array.isArray(raw) ? raw.join(', ') : raw,
        });
    };

    return {
        toast: show,
        loading,
        apiError,
        dismiss: (id?: string | number) => sonner.dismiss(id),
    };
}
