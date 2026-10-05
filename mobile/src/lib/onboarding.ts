import { api } from "./api";
import { registerForPush } from "./push";
import { useApp } from "./store";

/** Saves the onboarding draft as the user's profile on the server. */
export async function saveProfileFromDraft(): Promise<void> {
  const { draft, language, setProfileSaved, setNotificationsAsked } = useApp.getState();
  if (!draft.birthDate || !draft.place || !draft.focusArea) throw new Error("Onboarding incomplete");
  await api.upsertProfile({
    name: draft.name,
    birthDate: draft.birthDate,
    birthTime: draft.timeUnknown ? null : draft.birthTime,
    placeName: draft.place.name,
    lat: draft.place.lat,
    lng: draft.place.lng,
    focusArea: draft.focusArea,
    language: language ?? "en",
  });
  setProfileSaved(true);
  // Ask for notifications once, right after the first reading is promised.
  registerForPush().finally(() => setNotificationsAsked(true));
}
