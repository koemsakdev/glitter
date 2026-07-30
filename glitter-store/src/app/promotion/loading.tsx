import { NavLoadingBar } from '@/components/nav-loading-bar';
import { SKEL, ProductGridSkeleton } from '@/components/skeletons';

/** Promotion skeleton — gradient hero banner + on-sale product grid. */
export default function Loading() {
    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <NavLoadingBar />
            <div className={`h-40 w-full rounded-3xl ${SKEL}`} />
            <div className="mt-10">
                <ProductGridSkeleton count={10} />
            </div>
        </div>
    );
}
