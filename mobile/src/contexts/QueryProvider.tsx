/**
 * React Query provider for mobile app
 * Provides caching so screens don't re-fetch on every navigation
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000, // 5 minutes — weather/conditions don't change that fast
      gcTime: 30 * 60_000, // 30 minutes garbage collection
      retry: 1,
      refetchOnWindowFocus: false, // not relevant for mobile
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
