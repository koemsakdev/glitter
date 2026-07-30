import { NavLoadingBar } from '@/components/nav-loading-bar';
import { PageLoadingOverlay } from '@/components/page-loading-overlay';

/**
 * Shown INSTANTLY by Next.js whenever a route is server-rendering, so tapping a
 * link gives immediate feedback — a top progress bar PLUS a viewport-centred
 * spinner overlay that's visible even when the user is scrolled down the page.
 */
export default function Loading() {
    return (
        <>
            <NavLoadingBar />
            <PageLoadingOverlay />
            {/* Reserve height so the layout doesn't collapse while loading. */}
            <div className="min-h-[70vh]" />
        </>
    );
}
