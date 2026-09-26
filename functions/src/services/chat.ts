import * as logger from "firebase-functions/logger";
import { describePlacement, transitMoon } from "../astro";
import { CHAT_HISTORY_LIMIT } from "../config";
import { generateText, type ChatMessage } from "../lib/llm";
import { exhausted, unavailable } from "../lib/errors";
import { FieldValue, firestore, paths } from "../lib/firestore";
import { CHAT_SYSTEM, buildChatContext } from "../prompts/chat";
import { astroContext, loadProfile } from "./profile";

interface ChatMessageDoc {
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
}

/** Many models need alternating turns starting with the user; merge runs and drop a leading reply. */
export function toApiMessages(history: ChatMessageDoc[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const m of history) {
    if (m.failed) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`;
    else if (out.length > 0 || m.role === "user") out.push({ role: m.role, content: m.content });
  }
  return out;
}

/** Spends one credit, asks the model, stores both turns. Refunds the credit if generation fails. */
export async function sendChatMessage(uid: string, text: string) {
  const db = firestore();
  const profile = await loadProfile(uid);
  const entRef = db.doc(paths.entitlements(uid));
  const chatCol = db.collection(paths.chat(uid));
  const userMsgRef = chatCol.doc();

  const remaining = await db.runTransaction(async (tx) => {
    const ent = await tx.get(entRef);
    const credits = (ent.get("chatCredits") as number | undefined) ?? 0;
    if (credits < 1) throw exhausted("You're out of chat credits");
    tx.update(entRef, { chatCredits: FieldValue.increment(-1) });
    tx.set(userMsgRef, { role: "user", content: text, creditCost: 1, createdAt: FieldValue.serverTimestamp() });
    return credits - 1;
  });

  try {
    const recent = await chatCol.orderBy("createdAt", "desc").limit(CHAT_HISTORY_LIMIT).get();
    const history = recent.docs.reverse().map((d) => d.data() as ChatMessageDoc);
    const transit = describePlacement(transitMoon());
    const context = buildChatContext(
      astroContext(profile.chart),
      `Moon in ${transit.rashi.name} (${transit.rashi.english}), nakshatra ${transit.nakshatra.name}`,
      profile.language,
      profile.focusArea,
    );

    const reply = await generateText({
      label: "chat",
      system: `${CHAT_SYSTEM}\n\n${context}`,
      messages: toApiMessages(history),
      maxTokens: 1500,
      sessionId: `chat-${uid}`,
    });

    const replyRef = chatCol.doc();
    await replyRef.set({ role: "assistant", content: reply, createdAt: FieldValue.serverTimestamp() });
    return { messageId: replyRef.id, reply, creditsRemaining: remaining };
  } catch (err) {
    logger.error("chat.failed", { uid, err: String(err) });
    await db.runTransaction(async (tx) => {
      tx.update(entRef, { chatCredits: FieldValue.increment(1) });
      tx.update(userMsgRef, { failed: true, creditCost: 0 });
    });
    throw unavailable("The astrologer couldn't answer just now — your credit was refunded.");
  }
}
