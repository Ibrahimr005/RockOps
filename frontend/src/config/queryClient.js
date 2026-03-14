import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,       // 5 minutes — data considered fresh
            gcTime: 10 * 60 * 1000,          // 10 minutes — garbage collect unused
            refetchOnWindowFocus: false,      // Don't refetch when user tabs back
            retry: 1,                         // Retry once on failure
        },
    },
});
