import { HttpsError } from "firebase-functions/v2/https";

export { HttpsError };

export const notFound = (msg: string) => new HttpsError("not-found", msg);
export const invalid = (msg: string) => new HttpsError("invalid-argument", msg);
export const precondition = (msg: string) => new HttpsError("failed-precondition", msg);
export const denied = (msg: string) => new HttpsError("permission-denied", msg);
export const exhausted = (msg: string) => new HttpsError("resource-exhausted", msg);
export const unavailable = (msg: string) => new HttpsError("unavailable", msg);
