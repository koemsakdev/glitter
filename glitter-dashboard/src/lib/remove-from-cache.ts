import type { QueryClient, QueryKey } from '@tanstack/react-query';

type WithId = { id?: unknown };

/** Drop the item from one cached value (a plain array or a {data: []} page). */
function strip(old: unknown, id: string): unknown {
    if (Array.isArray(old)) {
        const next = old.filter((x) => (x as WithId)?.id !== id);
        return next.length === old.length ? old : next;
    }
    if (
        old &&
        typeof old === 'object' &&
        Array.isArray((old as { data?: unknown }).data)
    ) {
        const page = old as { data: WithId[]; total?: number };
        const data = page.data.filter((x) => x?.id !== id);
        if (data.length === page.data.length) return old;
        return {
            ...page,
            data,
            total:
                typeof page.total === 'number'
                    ? Math.max(0, page.total - (page.data.length - data.length))
                    : page.total,
        };
    }
    return old;
}

/**
 * After a successful delete, remove the item from every cached list under
 * `key` straight away — the row disappears instantly, without waiting for
 * the refetch (or a page reload). The caller still invalidates afterwards so
 * the server stays the source of truth.
 */
export function removeFromCache(
    queryClient: QueryClient,
    key: QueryKey,
    id: string,
): void {
    queryClient.setQueriesData({ queryKey: key }, (old: unknown) =>
        strip(old, id),
    );
}
