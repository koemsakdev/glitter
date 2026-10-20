'use client';

import { useState } from 'react';
import type { DataTableSort } from '@/components/data-table';

/**
 * Click-to-sort state for a server-sorted DataTable / ResourceList.
 * Columns opt in with `meta: { sortable: true }` and an `id` equal to the
 * API's sortBy value.
 */
export function useTableSort<T extends string>(
    defaultId: T,
    defaultDesc = true,
    onChange?: () => void,
) {
    const [sort, setSortState] = useState<DataTableSort>({
        id: defaultId,
        desc: defaultDesc,
    });
    return {
        sort,
        onSortChange: (s: DataTableSort) => {
            setSortState(s);
            onChange?.(); // e.g. back to page 1
        },
        sortBy: sort.id as T,
        sortOrder: (sort.desc ? 'DESC' : 'ASC') as 'ASC' | 'DESC',
    };
}
