import { NavLoadingBar } from '@/components/nav-loading-bar';

/**
 * Products listing skeleton — mirrors the real page (heading · search/filters ·
 * category chips · product grid) so loading looks like content arriving, not a
 * lone spinner floating on an empty page. Fills the viewport so it's visible
 * wherever the user is scrolled.
 */
export default function ProductsLoading() {
    const Box = 'animate-pulse bg-zinc-200 dark:bg-zinc-800';
    return (
        <div className="mx-auto max-w-6xl px-4 py-6">
            <NavLoadingBar />

            {/* Heading banner */}
            <div className={`h-24 w-full rounded-3xl ${Box}`} />

            {/* Search + filter row */}
            <div className="mt-5 flex items-center gap-3">
                <div className={`h-11 flex-1 rounded-full ${Box}`} />
                <div className={`h-11 w-11 rounded-full lg:w-40 ${Box}`} />
            </div>

            {/* Category chips */}
            <div className="mt-5 flex gap-2.5 overflow-hidden pb-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-9 w-24 shrink-0 rounded-full ${Box}`}
                    />
                ))}
            </div>

            {/* Product grid */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800"
                    >
                        <div className={`aspect-square w-full ${Box}`} />
                        <div className="space-y-2 p-3">
                            <div className={`h-4 w-3/4 rounded ${Box}`} />
                            <div className={`h-4 w-1/3 rounded ${Box}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
