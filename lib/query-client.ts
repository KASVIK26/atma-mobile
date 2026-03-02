/**
 * TanStack Query — shared QueryClient instance
 *
 * Centralised configuration for all server-state caching so every screen that
 * calls the same query key (e.g. ['dashboard', userId]) shares a cached result
 * instead of each making its own network request.
 *
 * Tuning notes for 1 000+ concurrent users:
 *  • staleTime 2 min  → dashboard data is considered fresh for 2 minutes after
 *    it was fetched. Tab switches / screen mounts within that window cost 0 RPCs.
 *  • gcTime 5 min     → unused cache entries live for 5 minutes before GC.
 *  • retry 2          → transient failures get 2 retries automatically.
 *  • retryDelay exp   → uses exponential back-off (consistent with lib/retry.ts).
 *  • throwOnError     → errors bubble to the nearest ErrorBoundary automatically.
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Fresh for 2 minutes — zero extra RPCs on tab switch / re-focus
      staleTime: 2 * 60 * 1_000,
      // Keep in cache 5 minutes after last subscriber unmounts
      gcTime: 5 * 60 * 1_000,
      // Retry transient failures twice with exponential back-off
      retry: 2,
      retryDelay: (attempt) =>
        Math.min(300 * Math.pow(2, attempt), 5_000),
      // Refetch when the window/app comes to foreground
      refetchOnWindowFocus: false, // handled explicitly via useFocusEffect
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // mutations should not be retried automatically
    },
  },
});
