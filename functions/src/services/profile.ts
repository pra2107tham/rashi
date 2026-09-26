import { find as findTimezone } from "geo-tz";
import { computeChart, describePlacement, RASHIS, type BirthChart } from "../astro";
import {
  DEFAULT_NOTIFY_HOUR, FREE_CHAT_CREDITS, PII_ENC_KEY,
  type FocusArea, type Language,
} from "../config";
import { decryptJson, encryptJson } from "../lib/crypto";
import { utcSlotFor } from "../lib/dates";
import { invalid, precondition } from "../lib/errors";
import { FieldValue, firestore, paths } from "../lib/firestore";
import type { BirthDetails } from "../lib/validate";
import type { AstroContext } from "../prompts/common";

export type StoredChart = Omit<BirthChart, "birthUtc">;

/** Shape of users/{uid}/private/birth. Personal fields live only inside `enc`. */
export interface BirthDoc {
  enc: string;
  tz: string;
  focusArea: FocusArea;
  chart: StoredChart;
}

export interface UserDoc {
  phone: string | null;
  language: Language;
  profileRev: number;
  notify: { enabled: boolean; localHour: number; tz: string; utcSlot: string };
  fcmTokens: string[];
}

export interface Profile extends BirthDetails {
  tz: string;
  focusArea: FocusArea;
  language: Language;
  chart: StoredChart;
  profileRev: number;
}

export function resolveTimezone(lat: number, lng: number): string {
  const tz = findTimezone(lat, lng)[0];
  if (!tz) throw invalid("Could not determine a timezone for the birth place");
  return tz;
}

export function chartFor(details: Pick<BirthDetails, "birthDate" | "birthTime" | "lat" | "lng">, tz: string): StoredChart {
  const { birthUtc: _birthUtc, ...chart } = computeChart({ ...details, tz });
  return chart;
}

export interface UpsertProfileInput extends BirthDetails {
  focusArea: FocusArea;
  language: Language;
}

export async function upsertProfile(uid: string, phone: string | null, input: UpsertProfileInput) {
  const { focusArea, language, ...details } = input;
  const tz = resolveTimezone(details.lat, details.lng);
  const chart = chartFor(details, tz);
  const key = PII_ENC_KEY.value();

  const db = firestore();
  const userRef = db.doc(paths.user(uid));
  const birthRef = db.doc(paths.birth(uid));
  const entRef = db.doc(paths.entitlements(uid));

  await db.runTransaction(async (tx) => {
    const [userSnap, entSnap] = await Promise.all([tx.get(userRef), tx.get(entRef)]);
    const birth: BirthDoc = { enc: encryptJson(details, key), tz, focusArea, chart };
    tx.set(birthRef, { ...birth, updatedAt: FieldValue.serverTimestamp() });

    if (userSnap.exists) {
      tx.update(userRef, {
        language,
        profileRev: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const user: UserDoc = {
        phone,
        language,
        profileRev: 1,
        // The notification schedule follows the device's timezone once registerDevice reports it.
        notify: { enabled: false, localHour: DEFAULT_NOTIFY_HOUR, tz, utcSlot: utcSlotFor(DEFAULT_NOTIFY_HOUR, tz) },
        fcmTokens: [],
      };
      tx.set(userRef, { ...user, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    }
    if (!entSnap.exists) {
      tx.set(entRef, { chatCredits: FREE_CHAT_CREDITS, unlocks: {}, subscription: null });
    }
  });

  return publicChart(chart);
}

export async function loadProfile(uid: string): Promise<Profile> {
  const db = firestore();
  const [userSnap, birthSnap] = await Promise.all([db.doc(paths.user(uid)).get(), db.doc(paths.birth(uid)).get()]);
  if (!userSnap.exists || !birthSnap.exists) throw precondition("Complete your birth profile first");
  const user = userSnap.data() as UserDoc;
  const birth = birthSnap.data() as BirthDoc;
  const details = decryptJson<BirthDetails>(birth.enc, PII_ENC_KEY.value());
  return {
    ...details,
    tz: birth.tz,
    focusArea: birth.focusArea,
    language: user.language,
    chart: birth.chart,
    profileRev: user.profileRev,
  };
}

/** What the app shows for a chart: sign and nakshatra labels, no raw data. */
export function publicChart(chart: StoredChart) {
  const placement = describePlacement(chart.moon);
  return {
    ...placement,
    ascendant: chart.ascendantRashi === null ? null : { index: chart.ascendantRashi, name: RASHIS[chart.ascendantRashi].name, english: RASHIS[chart.ascendantRashi].english },
    timeKnown: chart.timeKnown,
    nakshatraUncertain: chart.nakshatraUncertain,
  };
}

export function toPublicProfile(p: Profile) {
  return {
    name: p.name,
    birthDate: p.birthDate,
    birthTime: p.birthTime ?? null,
    placeName: p.placeName,
    lat: p.lat,
    lng: p.lng,
    focusArea: p.focusArea,
    language: p.language,
    chart: publicChart(p.chart),
  };
}

export function astroContext(chart: StoredChart): AstroContext {
  const { rashi, nakshatra } = describePlacement(chart.moon);
  return {
    moonRashi: `${rashi.name} (${rashi.english})`,
    rashiLord: rashi.lord,
    nakshatra: `${nakshatra.name}, pada ${nakshatra.pada}`,
    nakshatraLord: nakshatra.lord,
    ascendant: chart.ascendantRashi === null ? null : `${RASHIS[chart.ascendantRashi].name} (${RASHIS[chart.ascendantRashi].english})`,
    timeKnown: chart.timeKnown,
    nakshatraUncertain: chart.nakshatraUncertain,
  };
}

/** Deletes every document belonging to the user (DPDP / Play data-deletion requirement). */
export async function deleteUserData(uid: string): Promise<void> {
  const db = firestore();
  await db.recursiveDelete(db.doc(paths.user(uid)));
  await db.doc(paths.entitlements(uid)).delete();
  for (const collection of ["readings", "matches"]) {
    const snaps = await db.collection(collection).where("uid", "==", uid).get();
    for (const doc of snaps.docs) await db.recursiveDelete(doc.ref);
  }
  // Purchase records are kept for financial auditing, with the user link removed.
  const purchases = await db.collection("purchases").where("uid", "==", uid).get();
  const batch = db.batch();
  purchases.docs.forEach((d) => batch.update(d.ref, { uid: null, deletedUser: true }));
  await batch.commit();
}
