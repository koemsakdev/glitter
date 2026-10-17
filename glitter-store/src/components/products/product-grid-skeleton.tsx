/** Placeholder product cards — same grid as the real list, so nothing jumps. */
export function ProductCardSkeletons({ count }: { count: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="overflow-hidden rounded-2xl border border-zinc-100 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="aspect-square w-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />
                    <div className="space-y-2 p-3">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
            ))}
        </>
    );
}

export function ProductGridSkeleton({
    colClass,
    count = 10,
}: {
    colClass: string;
    count?: number;
}) {
    return (
        <div className="mt-4">
            <div className="h-4 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className={`mt-4 grid gap-(--ui-gap) ${colClass}`}>
                <ProductCardSkeletons count={count} />
            </div>
        </div>
    );
}
