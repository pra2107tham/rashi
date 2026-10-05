import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { syncStorage } from "./storage";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Readings are cached server-side per day; keep the last copy on the phone for offline opens.
      staleTime: 5 * 60_000,
      gcTime: 7 * 24 * 60 * 60_000,
      retry: 1,
    },
  },
});

/** Persists fetched readings, profile and chat to MMKV so the app opens with content offline. */
export const persister = createSyncStoragePersister({ storage: syncStorage, key: "query-cache", throttleTime: 1000 });

export const keys = {
  profile: ["profile"] as const,
  reading: (period: string) => ["reading", period] as const,
  chat: ["chat"] as const,
};
