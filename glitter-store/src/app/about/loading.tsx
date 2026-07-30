import { NavLoadingBar } from '@/components/nav-loading-bar';
import { SKEL } from '@/components/skeletons';

/** About skeleton — hero + story block + highlight cards. */
export default function Loading() {
    return (
        <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:py-14">
            <NavLoadingBar />
            <div className={`h-48 w-full rounded-3xl ${SKEL}`} />
            <div className={`h-64 w-full rounded-3xl ${SKEL}`} />
            <div className="grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`h-32 rounded-2xl ${SKEL}`} />
                ))}
            </div>
        </div>
    );
}
