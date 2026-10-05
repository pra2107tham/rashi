import { getMessaging, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

/**
 * Pushes carry a notification payload that Android shows on its own; the handler only has to
 * exist so data delivered in the background doesn't log a warning.
 */
export function registerBackgroundHandler(): void {
  setBackgroundMessageHandler(getMessaging(), async () => undefined);
}
