'use server';

import { updateTag } from 'next/cache';
import { LIVE_TAGS } from '@/lib/live-tags';

/**
 * Expire the cached storefront data behind the given realtime events, so the
 * refresh that follows reads fresh data instead of a cached copy (e.g. a
 * product deleted in the dashboard disappears right away). Unknown event
 * names are ignored, so callers can only expire the known storefront tags.
 */
export async function expireLiveTags(events: string[]): Promise<void> {
    const tags = new Set<string>();
    for (const e of events.slice(0, 20)) {
        for (const t of LIVE_TAGS[e] ?? []) tags.add(t);
    }
    for (const t of tags) updateTag(t);
}
