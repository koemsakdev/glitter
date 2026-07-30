import { NavLoadingBar } from '@/components/nav-loading-bar';
import { SKEL, CenteredHeaderSkeleton } from '@/components/skeletons';

/** Brands skeleton — centred header + search + brand-card grid (round logo + name). */
export default function Loading() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <NavLoadingBar />
            <CenteredHeaderSkeleton />

            {/* Search */}
            <div className={`mx-auto mt-8 h-11 w-full max-w-md rounded-full ${SKEL}`} />

            {/* Brand cards */}
            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {Array.from({ length: 15 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col items-center gap-3 rounded-2xl border border-zinc-100 p-5 dark:border-zinc-800"
                    >
                        <div className={`size-16 rounded-full ${SKEL}`} />
                        <div className={`h-4 w-20 rounded ${SKEL}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
