import { getCalendars } from "expo-localization";
import { api } from "./api";
import { getPushToken, onPushTokenRefresh } from "./firebase";

export const deviceTimeZone = () => getCalendars()[0]?.timeZone ?? "Asia/Kolkata";

/** Asks for permission (Android 13+), then registers this device for the morning reading push. */
export async function registerForPush(): Promise<boolean> {
  try {
    const token = await getPushToken();
    if (!token) return false;
    await api.registerDevice(token, deviceTimeZone());
    return true;
  } catch {
    return false;
  }
}

export function keepPushTokenFresh(): () => void {
  return onPushTokenRefresh((token) => {
    api.registerDevice(token, deviceTimeZone()).catch(() => undefined);
  });
}
