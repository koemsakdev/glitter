import type { ReactNode } from "react";

/** A numbered, card-wrapped step in the checkout flow. */
export function Section({
  step,
  title,
  action,
  children,
}: {
  step: number;
  title: string;
  /** Optional control shown at the right of the section header. */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/60 dark:bg-zinc-900/50">
      <h2 className="mb-5 flex items-center gap-3 text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        <span className="flex size-7 items-center justify-center rounded-full bg-(--brand) text-sm font-bold text-white shadow-sm shadow-(--brand)/30">
          {step}
        </span>
        {title}
        {action && <span className="ml-auto">{action}</span>}
      </h2>
      {children}
    </div>
  );
}
