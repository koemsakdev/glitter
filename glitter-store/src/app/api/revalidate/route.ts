import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { LIVE_TAGS } from '@/lib/live-tags';

/**
 * Called by the API (server → server) whenever data changes in the dashboard,
 * so cached storefront data is expired even when no shopper has the store
 * open. Protected by a shared secret: REVALIDATE_SECRET here and
 * STORE_REVALIDATE_SECRET on the API.
 */
export async function POST(req: Request) {
    const secret = process.env.REVALIDATE_SECRET;
    if (!secret || req.headers.get('x-revalidate-secret') !== secret) {
        return NextResponse.json({ ok: false }, { status: 401 });
    }
    const body = (await req.json().catch(() => ({}))) as { events?: unknown };
    const events = Array.isArray(body.events)
        ? body.events.filter((e): e is string => typeof e === 'string')
        : [];
    const tags = new Set(events.flatMap((e) => LIVE_TAGS[e] ?? []));
    // expire: 0 → gone now; the next visit fetches fresh (no stale copy).
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
    return NextResponse.json({ ok: true, tags: [...tags] });
}
