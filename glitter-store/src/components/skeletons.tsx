/** Shared loading-skeleton primitives so each route's `loading.tsx` mirrors the
 *  real page layout (no layout shift when the content swaps in). */

export const SKEL = 'animate-pulse bg-zinc-200 dark:bg-zinc-800';

/** Centred badge + title + subtitle (brands / stores headers). */
export function CenteredHeaderSkeleton() {
    return (
        <div className="flex flex-col items-center text-center">
            <div className={`h-6 w-28 rounded-full ${SKEL}`} />
            <div className={`mt-3 h-8 w-56 max-w-full rounded-lg ${SKEL}`} />
            <div className={`mt-2 h-4 w-72 max-w-full rounded ${SKEL}`} />
        </div>
    );
}

/** A responsive product-card grid (image + two text lines). */
export function ProductGridSkeleton({ count = 10 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-zinc-100 dark:border-zinc-800"
                >
                    <div className={`aspect-square w-full ${SKEL}`} />
                    <div className="space-y-2 p-3">
                        <div className={`h-4 w-3/4 rounded ${SKEL}`} />
                        <div className={`h-4 w-1/3 rounded ${SKEL}`} />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** A titled section: heading row + product grid (home sections). */
export function SectionSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="mx-auto mt-10 max-w-6xl px-4">
            <div className="flex items-center justify-between">
                <div className={`h-6 w-40 rounded-lg ${SKEL}`} />
                <div className={`h-5 w-20 rounded ${SKEL}`} />
            </div>
            <div className="mt-4">
                <ProductGridSkeleton count={count} />
            </div>
        </div>
    );
}
