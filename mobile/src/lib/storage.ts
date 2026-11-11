import { createMMKV } from "react-native-mmkv";

/** One app-wide key-value store (MMKV; localStorage on web). */
export const storage = createMMKV({ id: "rashi" });

/** Adapter for zustand's persist middleware and TanStack Query's persister. */
export const syncStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};
