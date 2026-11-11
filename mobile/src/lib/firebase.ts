import { getApp } from "@react-native-firebase/app";
import {
  PhoneAuthProvider, getAuth, linkWithCredential, onAuthStateChanged, signInAnonymously,
  signInWithCredential, signOut as fbSignOut, verifyPhoneNumber,
} from "@react-native-firebase/auth";
import { getFunctions, httpsCallable } from "@react-native-firebase/functions";
import {
  AuthorizationStatus, getMessaging, getToken, onTokenRefresh, requestPermission,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

/**
 * The only module that touches native Firebase. firebase.web.ts mirrors it with canned data so the
 * screens can be rendered in a browser for design review.
 */

const REGION = "asia-south1";

export function callFunction<T>(name: string, data: unknown = {}): Promise<T> {
  const fn = httpsCallable<unknown, T>(getFunctions(getApp(), REGION), name, { timeout: 180_000 });
  return fn(data).then((r) => r.data);
}

/** Resolves once a user exists, signing in anonymously on first launch. */
export function ensureSignedIn(): Promise<string> {
  const auth = getAuth();
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user.uid);
      } else {
        signInAnonymously(auth).catch((e) => {
          unsubscribe();
          reject(e);
        });
      }
    });
  });
}

export interface PhoneVerification {
  verificationId: string;
  /** Android can verify the SMS by itself; then no code needs typing. */
  autoCode: string | null;
}

/** Sends the OTP. Doesn't sign in, so the anonymous account (and its data) can be linked afterwards. */
export function sendPhoneCode(phoneE164: string, forceResend = false): Promise<PhoneVerification> {
  return new Promise((resolve, reject) => {
    verifyPhoneNumber(getAuth(), phoneE164, forceResend).on(
      "state_changed",
      (snap) => {
        if (snap.state === "sent" || snap.state === "verified") {
          resolve({ verificationId: snap.verificationId, autoCode: snap.code });
        } else if (snap.state === "error") {
          reject(snap.error);
        }
      },
      (err) => reject(err),
    );
  });
}

/**
 * Attaches the phone number to the current anonymous account. If the number already belongs to an
 * account (reinstall, new phone), signs into that account instead.
 */
export async function confirmPhoneCode(verificationId: string, code: string): Promise<"linked" | "existing"> {
  const auth = getAuth();
  const credential = PhoneAuthProvider.credential(verificationId, code);
  const user = auth.currentUser;
  if (user?.isAnonymous) {
    try {
      await linkWithCredential(user, credential);
      await user.getIdToken(true); // so the next call carries phone_number
      return "linked";
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "auth/credential-already-in-use" && code !== "auth/provider-already-linked") throw e;
    }
  }
  await signInWithCredential(auth, credential);
  return "existing";
}

export async function signOut(): Promise<void> {
  await fbSignOut(getAuth());
}

/** Asks for notification permission and returns the FCM token, or null if refused. */
export async function getPushToken(): Promise<string | null> {
  if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    if (res !== PermissionsAndroid.RESULTS.GRANTED) return null;
  }
  const messaging = getMessaging();
  const status = await requestPermission(messaging);
  if (status === AuthorizationStatus.DENIED) return null;
  return getToken(messaging);
}

export function onPushTokenRefresh(listener: (token: string) => void): () => void {
  return onTokenRefresh(getMessaging(), listener);
}
