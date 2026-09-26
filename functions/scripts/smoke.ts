/**
 * Live smoke test for the AI layer: real OpenRouter calls through the exact prompts, schemas and
 * client the deployed functions use. No Firestore, no app, no credentials besides the OpenRouter key.
 *
 *   OPENROUTER_API_KEY=$(firebase functions:secrets:access OPENROUTER_API_KEY) \
 *   SARVAM_API_KEY=$(firebase functions:secrets:access SARVAM_API_KEY) npm run smoke
 *
 * Hindi goes to Sarvam, English to OpenRouter. Makes 7 calls (about a rupee in total). Pass --only=reading|match|chat|notification to run one.
 */
import { ashtakoot, describePlacement, transitFacts, transitMoon } from "../src/astro";
import { LLM, type FocusArea, type Language, type Period } from "../src/config";
import { describePeriod } from "../src/lib/dates";
import { generateJson, generateText } from "../src/lib/llm";
import { CHAT_SYSTEM, buildChatContext } from "../src/prompts/chat";
import { MATCH_SYSTEM, buildMatchPrompt, matchNarrativeSchema } from "../src/prompts/match";
import { NOTIFICATION_SYSTEM, buildNotificationPrompt } from "../src/prompts/notification";
import { READING_SYSTEM, buildReadingPrompt, readingSchema, type ReadingContent } from "../src/prompts/reading";
import { astroContext, chartFor } from "../src/services/profile";

// The functions logger writes structured JSON lines to stdout. Keep the "llm.call" lines (model picked,
// tokens, cost) for the summary table and hide the rest of the log noise.
const calls: { label: string; provider?: string; model?: string; costUsd?: number; ms?: number; inputTokens?: number; outputTokens?: number; reasoningTokens?: number }[] = [];
const sarvamFallbacks: string[] = [];
const write = process.stdout.write.bind(process.stdout);
process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
  const text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
  if (text.startsWith("{") && text.includes('"severity"')) {
    try {
      const entry = JSON.parse(text);
      if (entry.message === "llm.call") calls.push(entry);
      if (entry.message === "llm.sarvam_fallback") sarvamFallbacks.push(`${entry.label}: ${entry.err}`);
    } catch { /* not a log line */ }
    return true;
  }
  return (write as (...a: unknown[]) => boolean)(chunk, ...rest);
}) as typeof process.stdout.write;
const origLog = console.log;

const TZ = "Asia/Kolkata";
const me = { birthDate: "1996-04-12", birthTime: "07:30", lat: 18.5204, lng: 73.8567 }; // Pune
const partner = { birthDate: "1994-11-02", birthTime: "18:10", lat: 21.1458, lng: 79.0882 }; // Nagpur
const focus: FocusArea = "career";

const myChart = chartFor(me, TZ);
const partnerChart = chartFor(partner, TZ);
const astro = astroContext(myChart);
const now = new Date();
const facts = transitFacts(myChart.moon, transitMoon(now));

const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const want = (name: string) => !only || only === name;

function header(title: string) {
  origLog(`\n${"─".repeat(70)}\n${title}\n${"─".repeat(70)}`);
}

function printReading(r: ReadingContent) {
  origLog(`★ ${r.headline}   [mood: ${r.mood}]\n  ${r.teaser}\n`);
  for (const s of r.sections) origLog(`  ▸ ${s.title} (${s.area})\n    ${s.body}\n`);
  origLog(`  Lucky: ${r.lucky.color}, ${r.lucky.number}, ${r.lucky.time}\n  Remedy: ${r.remedy}`);
}

async function reading(language: Language, period: Period = "today") {
  header(`Reading · ${period} · ${language}`);
  const r = await generateJson({
    label: `reading:${period}:${language}`,
    language,
    system: READING_SYSTEM,
    messages: [{
      role: "user",
      content: buildReadingPrompt({
        period, periodDescription: describePeriod(period, TZ, now), focusArea: focus, language, astro, facts,
      }),
    }],
    schema: readingSchema,
    schemaName: "horoscope_reading",
    maxTokens: LLM.maxTokens.reading,
  });
  printReading(r);
  return r;
}

async function match(language: Language) {
  header(`Kundli match · ${language}`);
  const result = ashtakoot(partnerChart as never, myChart as never); // partner = groom, me = bride
  const label = (c: typeof myChart) => {
    const p = describePlacement(c.moon);
    return { rashi: `${p.rashi.name} (${p.rashi.english})`, nakshatra: p.nakshatra.name };
  };
  const n = await generateJson({
    label: `match:${language}`,
    language,
    system: MATCH_SYSTEM,
    messages: [{
      role: "user",
      content: buildMatchPrompt({
        language,
        personA: { label: "The user", ...label(myChart) },
        personB: { label: "Their partner", ...label(partnerChart) },
        scores: { ...result.scores },
        doshas: {
          nadi: result.doshas.nadi, bhakoot: result.doshas.bhakoot,
          manglikA: result.doshas.manglik.bride.isManglik, manglikB: result.doshas.manglik.groom.isManglik,
        },
      }),
    }],
    schema: matchNarrativeSchema,
    schemaName: "kundli_match",
    maxTokens: LLM.maxTokens.match,
  });
  origLog(`Score: ${result.scores.total}/36  ${JSON.stringify(result.scores)}`);
  origLog(`\n★ ${n.headline}\n  ${n.summary}\n  + ${n.strengths.join("\n  + ")}\n  − ${n.cautions.join("\n  − ")}`);
  origLog(`  Dosha: ${n.doshaNote}\n  Share: “${n.shareLine}”`);
}

async function chat(language: Language) {
  header(`Chat · ${language}`);
  const q = language === "hi" ? "क्या इस महीने नौकरी बदलना ठीक रहेगा?" : "Is this a good month to switch jobs?";
  const reply = await generateText({
    label: `chat:${language}`,
    language,
    system: `${CHAT_SYSTEM}\n\n${buildChatContext(astro, facts, language, focus)}`,
    messages: [{ role: "user", content: q }],
    maxTokens: LLM.maxTokens.chat,
    sessionId: "smoke-test",
  });
  origLog(`Q: ${q}\nA: ${reply}`);
}

async function notification(r: ReadingContent, language: Language) {
  header(`Push notification · ${language}`);
  const body = await generateText({
    label: `notification:${language}`,
    language,
    system: NOTIFICATION_SYSTEM,
    messages: [{ role: "user", content: buildNotificationPrompt(r.headline, r.teaser, language) }],
    maxTokens: LLM.maxTokens.notification,
  });
  origLog(`${body}   (${body.length} chars)`);
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY || !process.env.SARVAM_API_KEY) {
    origLog(
      "Set OPENROUTER_API_KEY and SARVAM_API_KEY, e.g.\n" +
      "  OPENROUTER_API_KEY=$(firebase functions:secrets:access OPENROUTER_API_KEY) \\\n" +
      "  SARVAM_API_KEY=$(firebase functions:secrets:access SARVAM_API_KEY) npm run smoke",
    );
    process.exit(1);
  }
  const p = describePlacement(myChart.moon);
  origLog(`Test chart: Moon in ${p.rashi.name}, ${p.nakshatra.name} pada ${p.nakshatra.pada}; transit Moon in ${facts.transit.rashi.name} → house ${facts.house}, tara ${facts.tara.name}`);

  const failures: string[] = [];
  const step = async (name: string, fn: () => Promise<unknown>) => {
    try {
      return await fn();
    } catch (err) {
      failures.push(name);
      origLog(`✗ ${name} failed: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    }
  };

  let en: ReadingContent | undefined;
  let hi: ReadingContent | undefined;
  if (want("reading") || want("notification")) {
    en = (await step("reading en", () => reading("en"))) as ReadingContent | undefined;
    hi = (await step("reading hi", () => reading("hi"))) as ReadingContent | undefined;
  }
  if (want("match")) await step("match hi", () => match("hi"));
  if (want("chat")) {
    await step("chat en", () => chat("en"));
    await step("chat hi", () => chat("hi"));
  }
  if (want("notification")) {
    if (en) await step("notification en", () => notification(en!, "en"));
    if (hi) await step("notification hi", () => notification(hi!, "hi"));
  }

  header("Calls (Hindi → Sarvam, English → OpenRouter Auto Router)");
  if (sarvamFallbacks.length) origLog(`⚠ Sarvam failed and fell back to OpenRouter:\n  ${sarvamFallbacks.join("\n  ")}\n`);
  let total = 0;
  for (const c of calls) {
    total += c.costUsd ?? 0;
    origLog(
      `${c.label.padEnd(18)} ${String(c.provider ?? "?").padEnd(11)} ${String(c.model ?? "?").padEnd(34)} ${String(c.ms ?? "?").padStart(6)} ms  ` +
      `${c.inputTokens ?? "?"}→${c.outputTokens ?? "?"} tok (${c.reasoningTokens ?? 0} thinking)  $${(c.costUsd ?? 0).toFixed(5)}`,
    );
  }
  origLog(`Total: $${total.toFixed(5)}  (~₹${(total * 84).toFixed(3)})`);
  if (failures.length) {
    origLog(`\n✗ ${failures.length} step(s) failed: ${failures.join(", ")}`);
    process.exit(1);
  }
  origLog("\n✓ All steps passed");
}

main();
