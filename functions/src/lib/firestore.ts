import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore, type Firestore } from "firebase-admin/firestore";

let db: Firestore | undefined;

export function firestore(): Firestore {
  if (!db) {
    if (getApps().length === 0) initializeApp();
    db = getFirestore();
  }
  return db;
}

export { FieldValue, Timestamp };

export const paths = {
  user: (uid: string) => `users/${uid}`,
  birth: (uid: string) => `users/${uid}/private/birth`,
  chat: (uid: string) => `users/${uid}/chat`,
  reading: (id: string) => `readings/${id}`,
  readingFull: (id: string) => `readings/${id}/full/content`,
  entitlements: (uid: string) => `entitlements/${uid}`,
  purchase: (token: string) => `purchases/${token}`,
  match: (id: string) => `matches/${id}`,
  lock: (id: string) => `locks/${id}`,
  rateLimit: (key: string) => `rateLimits/${key}`,
};
