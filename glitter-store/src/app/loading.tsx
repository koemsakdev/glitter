import { NavLoadingBar } from '@/components/nav-loading-bar';

/**
 * Generic route-loading skeleton — a few content blocks that fill the viewport
 * so loading reads as "content arriving" and is visible wherever the user has
 * scrolled, instead of a lone spinner floating on an empty page. (Routes with
 * their own skeleton — e.g. /products — override this.)
 */
export default function Loading() {
    const Box = 'animate-pulse bg-zinc-200 dark:bg-zinc-800';
    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <NavLoadingBar />

            <div className={`h-8 w-52 rounded-lg ${Box}`} />
            <div className={`mt-3 h-4 w-72 max-w-full rounded ${Box}`} />

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className={`h-44 rounded-2xl ${Box}`} />
                ))}
            </div>

            <div className={`mt-6 h-64 w-full rounded-2xl ${Box}`} />
        </div>
    );
}
