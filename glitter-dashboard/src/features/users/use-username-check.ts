'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { userApi } from './user-api';

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/;

export type UsernameStatus =
    | 'idle' // empty, or unchanged from the user's current name
    | 'invalid' // wrong format (shown instantly, no request)
    | 'checking'
    | 'available'
    | 'taken'
    | 'error';

/**
 * Live username validation for the staff form: format is checked on every
 * keystroke; availability is asked of the API once typing pauses (debounced),
 * and cached per name so retyping a name is instant.
 */
export function useUsernameCheck(
    username: string,
    opts: { currentUsername?: string | null; excludeId?: string; enabled: boolean },
): UsernameStatus {
    const name = username.trim().toLowerCase();
    const [debounced, setDebounced] = useState(name);

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(name), 400);
        return () => clearTimeout(timer);
    }, [name]);

    const unchanged = !!opts.currentUsername && name === opts.currentUsername;
    const valid = USERNAME_PATTERN.test(name);
    const shouldAsk = opts.enabled && valid && !unchanged;

    const query = useQuery({
        queryKey: ['username-available', debounced, opts.excludeId ?? null],
        queryFn: () => userApi.checkUsername(debounced, opts.excludeId),
        enabled: shouldAsk && debounced === name,
        staleTime: 30_000,
    });

    if (!opts.enabled || name === '' || unchanged) return 'idle';
    if (!valid) return 'invalid';
    if (debounced !== name || query.isFetching || query.isPending) {
        return 'checking';
    }
    if (query.isError) return 'error';
    return query.data?.available
        ? 'available'
        : query.data?.reason === 'invalid'
          ? 'invalid'
          : 'taken';
}
