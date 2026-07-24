import { NavLoadingBar } from '@/components/nav-loading-bar';

/**
 * Shown INSTANTLY by Next.js whenever a route is server‑rendering, so tapping a
 * link gives immediate feedback (a top progress bar + a centred spinner)
 * instead of looking frozen while the page loads.
 */
export default function Loading() {
    return (
        <>
            {/* Top progress bar — portaled to <body> so it sits above the navbar */}
            <NavLoadingBar />

            {/* Centred spinner in the content area */}
            <div className="flex min-h-[55vh] items-center justify-center">
                <span className="size-9 animate-spin rounded-full border-[3px] border-zinc-200 border-t-(--brand) dark:border-zinc-700 dark:border-t-(--brand)" />
            </div>
        </>
    );
}
