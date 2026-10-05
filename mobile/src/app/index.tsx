import { Redirect } from "expo-router";
import { useApp } from "../lib/store";

/** Routes to wherever the user left off. */
export default function Index() {
  const { language, profileSaved } = useApp();
  if (profileSaved) return <Redirect href="/home" />;
  if (!language) return <Redirect href="/onboarding/language" />;
  return <Redirect href="/onboarding/welcome" />;
}
