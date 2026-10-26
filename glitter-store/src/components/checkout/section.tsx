import { Check } from "lucide-react";
import type { ReactNode } from "react";

/** A numbered, card-wrapped step in the checkout flow. */
export function Section({
  step,
  icon,
  title,
  description,
  done = false,
  action,
  children,
}: {
  /** Step number; omit for an unnumbered card (then `icon` is shown). */
  step?: number;
  icon?: ReactNode;
  title: string;
  /** Short helper line under the title. */
  description?: string;
  /** Step is complete — the number turns into a check. */
  done?: boolean;
  /** Optional control shown at the right of the section header. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-5 flex items-start gap-3">
        <span
          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
            done
              ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
              : "bg-(--brand)/10 text-(--brand) ring-1 ring-(--brand)/20"
          }`}
        >
          {done ? <Check className="size-4" strokeWidth={3} /> : (step ?? icon)}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-8 tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h2>
          {description && (
            <p className="-mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 pt-1.5">{action}</div>}
      </div>
      {children}
    </section>
  );
}
