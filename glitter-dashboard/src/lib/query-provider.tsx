'use client';

/**
 * TanStack Query provider. Wraps the app so any component can use
 * useQuery / useMutation hooks for data fetching.
 */
import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';

const queryConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s — data is "fresh" for this long
      // Keep visited pages' data for 15 min, so coming back shows it instantly
      // (and refreshes quietly) instead of a loading screen.
      gcTime: 15 * 60 * 1000,
      refetchOnWindowFocus: false, // don't refetch every time user alt-tabs
      retry: 1, // one retry on failure (not exponential backoff)
    },
    mutations: {
      retry: 0, // don't retry mutations (POST/PATCH/DELETE)
    },
  },
};

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create client inside component so it's stable across renders
  // but not shared between different users in SSR contexts.
  const [queryClient] = useState(() => new QueryClient(queryConfig));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}