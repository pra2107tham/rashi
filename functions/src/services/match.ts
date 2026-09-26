import { ashtakoot, describePlacement, type BirthChart } from "../astro";
import { MODELS, PII_ENC_KEY } from "../config";
import { generateJson } from "../lib/claude";
import { encryptJson, sha256 } from "../lib/crypto";
import { unavailable } from "../lib/errors";
import { FieldValue, firestore, paths } from "../lib/firestore";
import type { BirthDetails } from "../lib/validate";
import { MATCH_PROMPT_VERSION, MATCH_SYSTEM, buildMatchPrompt, matchNarrativeSchema } from "../prompts/match";
import { chartFor, loadProfile, resolveTimezone, type StoredChart } from "./profile";
import * as logger from "firebase-functions/logger";

export interface CreateMatchInput {
  /** The app user's role in the traditional calculation (Ashtakoot is not symmetric). */
  userRole: "groom" | "bride";
  other: BirthDetails;
}

const asChart = (c: StoredChart): BirthChart => ({ ...c, birthUtc: "" });

function label(chart: StoredChart) {
  const { rashi, nakshatra } = describePlacement(chart.moon);
  return {
    rashi: `${rashi.name} (${rashi.english})`,
    nakshatra: nakshatra.name,
    rashiIndex: rashi.index,
    nakshatraIndex: nakshatra.index,
  };
}

export async function createMatch(uid: string, input: CreateMatchInput) {
  const profile = await loadProfile(uid);
  const o = input.other;
  const id = sha256(
    uid, input.userRole, o.birthDate, o.birthTime ?? "", o.lat.toFixed(3), o.lng.toFixed(3),
    String(profile.profileRev), profile.language, MATCH_PROMPT_VERSION,
  ).slice(0, 40);
  const ref = firestore().doc(paths.match(id));
  const cached = await ref.get();
  if (cached.exists) return { id, ...publicMatch(cached.data()!), otherName: o.name, cached: true };

  const otherChart = chartFor(o, resolveTimezone(o.lat, o.lng));
  const [groom, bride] = input.userRole === "groom" ? [profile.chart, otherChart] : [otherChart, profile.chart];
  const result = ashtakoot(asChart(groom), asChart(bride));

  const you = label(profile.chart);
  const them = label(otherChart);
  const youManglik = input.userRole === "groom" ? result.doshas.manglik.groom : result.doshas.manglik.bride;
  const themManglik = input.userRole === "groom" ? result.doshas.manglik.bride : result.doshas.manglik.groom;

  let narrative;
  try {
    narrative = await generateJson({
      label: "match",
      model: MODELS.match,
      system: MATCH_SYSTEM,
      messages: [{
        role: "user",
        content: buildMatchPrompt({
          language: profile.language,
          personA: { label: "The user", ...you },
          personB: { label: "Their partner", ...them },
          scores: { ...result.scores },
          doshas: { nadi: result.doshas.nadi, bhakoot: result.doshas.bhakoot, manglikA: youManglik.isManglik, manglikB: themManglik.isManglik },
        }),
      }],
      schema: matchNarrativeSchema,
      maxTokens: 3000,
      effort: "low",
    });
  } catch (err) {
    logger.error("match.generate_failed", { uid, err: String(err) });
    throw unavailable("We couldn't prepare the match right now. Please try again.");
  }

  const doc = {
    uid,
    userRole: input.userRole,
    otherEnc: encryptJson(o, PII_ENC_KEY.value()),
    you,
    them,
    scores: result.scores,
    doshas: {
      nadi: result.doshas.nadi,
      bhakoot: result.doshas.bhakoot,
      manglik: { you: youManglik, them: themManglik, mismatch: result.doshas.manglik.mismatch },
    },
    narrative,
    language: profile.language,
    promptVersion: MATCH_PROMPT_VERSION,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { id, ...publicMatch(doc), otherName: o.name, cached: false };
}

function publicMatch(doc: FirebaseFirestore.DocumentData) {
  return {
    you: doc.you,
    them: doc.them,
    scores: doc.scores,
    doshas: doc.doshas,
    narrative: doc.narrative,
  };
}
