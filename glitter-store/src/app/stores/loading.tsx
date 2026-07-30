import { NavLoadingBar } from '@/components/nav-loading-bar';
import { SKEL, CenteredHeaderSkeleton } from '@/components/skeletons';

/** Stores skeleton — centred header + two-column store cards. */
export default function Loading() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <NavLoadingBar />
            <CenteredHeaderSkeleton />
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className={`h-56 rounded-3xl ${SKEL}`} />
                ))}
            </div>
        </div>
    );
}
