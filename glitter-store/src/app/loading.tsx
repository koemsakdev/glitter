import { NavLoadingBar } from '@/components/nav-loading-bar';
import { SKEL, SectionSkeleton } from '@/components/skeletons';

/**
 * Home skeleton — hero banner + features strip + product sections, mirroring the
 * real home page. (Other routes have their own loading.tsx so they don't inherit
 * this one.)
 */
export default function Loading() {
    return (
        <div>
            <NavLoadingBar />

            {/* Hero banner */}
            <div className="mx-auto max-w-6xl px-4 pt-4">
                <div className={`aspect-21/9 w-full rounded-3xl ${SKEL}`} />
            </div>

            {/* Features strip */}
            <div className="mx-auto mt-6 max-w-6xl px-4">
                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-zinc-100 p-4 sm:grid-cols-4 sm:p-5 dark:border-zinc-800">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-12 rounded-xl ${SKEL}`} />
                    ))}
                </div>
            </div>

            {/* Product sections */}
            <SectionSkeleton />
            <SectionSkeleton />
        </div>
    );
}
