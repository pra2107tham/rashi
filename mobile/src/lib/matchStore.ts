import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MatchResult } from "./api";
import { syncStorage } from "./storage";

/** The latest kundli match, kept on the phone so the Match tab reopens on the result. */
export const useMatchStore = create<{ last: MatchResult | null; setLast: (m: MatchResult | null) => void }>()(
  persist((set) => ({ last: null, setLast: (last) => set({ last }) }), { name: "match", storage: createJSONStorage(() => syncStorage) }),
);
