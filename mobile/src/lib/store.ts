import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { syncStorage } from "./storage";

export type Language = "hi" | "en";
export type FocusArea = "love" | "career" | "money" | "health" | "curious";

export interface Place {
  name: string;
  region: string;
  country: string;
  lat: number;
  lng: number;
}

/** What onboarding collects before the profile is saved on the server. */
export interface Draft {
  name: string;
  birthDate: string | null; // YYYY-MM-DD
  birthTime: string | null; // HH:mm (24h); null when unknown
  timeUnknown: boolean;
  place: Place | null;
  focusArea: FocusArea | null;
}

interface AppState {
  language: Language | null;
  draft: Draft;
  /** Set once upsertProfile succeeds; routes the app past onboarding. */
  profileSaved: boolean;
  notificationsAsked: boolean;
  setLanguage: (l: Language) => void;
  updateDraft: (patch: Partial<Draft>) => void;
  setProfileSaved: (v: boolean) => void;
  setNotificationsAsked: (v: boolean) => void;
  reset: () => void;
}

const emptyDraft: Draft = { name: "", birthDate: null, birthTime: null, timeUnknown: false, place: null, focusArea: null };

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      language: null,
      draft: emptyDraft,
      profileSaved: false,
      notificationsAsked: false,
      setLanguage: (language) => set({ language }),
      updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      setProfileSaved: (profileSaved) => set({ profileSaved }),
      setNotificationsAsked: (notificationsAsked) => set({ notificationsAsked }),
      reset: () => set({ language: null, draft: emptyDraft, profileSaved: false, notificationsAsked: false }),
    }),
    { name: "app-state", storage: createJSONStorage(() => syncStorage), version: 1 },
  ),
);
