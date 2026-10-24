"use client";

import { toast as sonner } from "sonner";
import {
    BellRing,
    CheckCircle2,
    Info,
    Loader2,
    TriangleAlert,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ToastVariant =
    | "default"
    | "destructive"
    | "success"
    | "info"
    | "warning"
    | "loading";

interface AppToastOptions {
    variant?: ToastVariant;
    title: string;
    description?: string;
    duration?: number;
    /** Reuse an id to replace a toast in place (e.g. loading → success). */
    id?: string | number;
}

const STYLES: Record<
    ToastVariant,
    { icon: LucideIcon; chip: string; bar: string; role: "status" | "alert" }
> = {
    default: {
        icon: BellRing,
        chip: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
        bar: "bg-pink-500",
        role: "status",
    },
    success: {
        icon: CheckCircle2,
        chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        bar: "bg-emerald-500",
        role: "status",
    },
    destructive: {
        icon: XCircle,
        chip: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        bar: "bg-rose-500",
        role: "alert",
    },
    warning: {
        icon: TriangleAlert,
        chip: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
        bar: "bg-amber-500",
        role: "alert",
    },
    info: {
        icon: Info,
        chip: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        bar: "bg-sky-500",
        role: "status",
    },
    loading: {
        icon: Loader2,
        chip: "bg-pink-500/10 text-pink-600 dark:text-pink-300",
        bar: "bg-pink-500",
        role: "status",
    },
};

/** One toast card: icon, title, message, close button and a countdown bar. */
function AppToast({
    id,
    variant,
    title,
    description,
    duration,
}: {
    id: string | number;
    variant: ToastVariant;
    title: string;
    description?: string;
    duration: number;
}) {
    const s = STYLES[variant];
    const Icon = s.icon;
    const timed = variant !== "loading" && Number.isFinite(duration);
    return (
        <div
            role={s.role}
            className="relative flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border bg-popover/95 p-3.5 pr-10 text-popover-foreground shadow-lg shadow-black/5 backdrop-blur-md dark:shadow-black/30"
        >
            <span
                className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl",
                    s.chip,
                )}
            >
                <Icon
                    className={cn(
                        "size-[18px]",
                        variant === "loading" && "animate-spin",
                    )}
                />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-semibold leading-snug">{title}</p>
                {description && (
                    <p className="mt-0.5 break-words text-[13px] leading-snug text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {variant !== "loading" && (
                <button
                    type="button"
                    onClick={() => sonner.dismiss(id)}
                    aria-label="Close"
                    className="absolute right-2.5 top-2.5 flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-pink-500"
                >
                    <X className="size-3.5" />
                </button>
            )}
            {timed && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
                    <span
                        className={cn("toast-countdown block h-full", s.bar)}
                        style={
                            {
                                "--toast-duration": `${duration}ms`,
                            } as React.CSSProperties
                        }
                    />
                </span>
            )}
        </div>
    );
}

export function useToast() {
    const { t } = useI18n();

    const show = ({
        variant = "default",
        title,
        description,
        duration,
        id,
    }: AppToastOptions) => {
        // Errors stay a little longer so they can be read.
        const ms =
            duration ??
            (variant === "loading"
                ? Infinity
                : variant === "destructive"
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
        show({ variant: "loading", title, description });

    const apiError = (err: unknown) => {
        const e = err as {
            response?: { data?: { message?: string | string[] } };
            message?: string;
        };
        const raw = e?.response?.data?.message ?? e?.message;
        show({
            variant: "destructive",
            title: t("common.toast.error"),
            description: Array.isArray(raw) ? raw.join(", ") : raw,
        });
    };

    return {
        toast: show,
        loading,
        apiError,
        dismiss: (id?: string | number) => sonner.dismiss(id),
    };
}
