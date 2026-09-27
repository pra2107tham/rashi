import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { LLM, OPENROUTER_API_KEY, SARVAM_API_KEY } from "../config";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const SARVAM_ENDPOINT = "https://api.sarvam.ai/v1/chat/completions";
const TIMEOUT_MS = 90_000;
const RETRIES = 2;

export class GenerationError extends Error {
  constructor(message: string, readonly reason: "http" | "refusal" | "max_tokens" | "parse" | "empty") {
    super(message);
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BaseRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  /** Short label for logs, e.g. "reading:today". Never include personal data. */
  label: string;
  /** Output language. Decides the provider: Sarvam for Indic languages, OpenRouter otherwise. */
  language?: string;
  /** Multi-turn chat: keeps a conversation on one routed model, and uses Sarvam's conversational model. */
  sessionId?: string;
  /** Send to Sarvam whatever the language (short, latency-sensitive copy); still falls back to OpenRouter. */
  preferSarvam?: boolean;
}

interface JsonSchemaFormat {
  name: string;
  schema: Record<string, unknown>;
}

/** OpenAI-compatible response shape shared by OpenRouter and Sarvam. */
interface CompletionResponse {
  model?: string;
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string | null }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: number | string } | string;
}

type Provider = "openrouter" | "sarvam";

async function post(url: string, headers: Record<string, string>, body: object, label: string): Promise<CompletionResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await res.json().catch(() => ({}))) as CompletionResponse;
      if (res.ok && !data.error) return data;
      const detail = typeof data.error === "string" ? data.error : data.error?.message ?? "";
      lastErr = new GenerationError(`${label}: HTTP ${res.status} ${detail}`.trim(), "http");
      // Retry only rate limits and server-side failures.
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastErr = err;
      // A timed-out call already used the time budget; retrying would outlast the function timeout.
      if (err instanceof Error && err.name === "TimeoutError") break;
    }
  }
  throw lastErr;
}

function responseFormat(json?: JsonSchemaFormat) {
  return json ? { response_format: { type: "json_schema", json_schema: { name: json.name, strict: true, schema: json.schema } } } : {};
}

/**
 * OpenRouter's Auto Router picks a model from the cheapest cost band that supports every parameter
 * we send, with a hard per-token price ceiling as a safety net.
 */
function callOpenRouter(req: BaseRequest, json?: JsonSchemaFormat) {
  return post(
    OPENROUTER_ENDPOINT,
    { Authorization: `Bearer ${OPENROUTER_API_KEY.value().trim()}`, "HTTP-Referer": LLM.appUrl, "X-Title": LLM.appName },
    {
      model: LLM.model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      max_tokens: req.maxTokens,
      reasoning: LLM.reasoning,
      plugins: [{ id: "auto-router", cost_tier: LLM.costTier }, ...(json ? [{ id: "response-healing" }] : [])],
      provider: { require_parameters: true, max_price: LLM.maxPricePerMillion },
      ...(req.sessionId ? { session_id: req.sessionId } : {}),
      ...responseFormat(json),
    },
    req.label,
  );
}

function callSarvam(req: BaseRequest, json?: JsonSchemaFormat) {
  return post(
    SARVAM_ENDPOINT,
    // Sarvam authenticates with its own header only; an extra Authorization header gets a 403.
    { "api-subscription-key": SARVAM_API_KEY.value().trim() },
    {
      model: req.sessionId ? LLM.sarvam.chatModel : LLM.sarvam.model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      max_tokens: Math.min(req.maxTokens, LLM.sarvam.maxTokensCap),
      reasoning_effort: LLM.sarvam.reasoningEffort,
      temperature: LLM.sarvam.temperature,
      ...responseFormat(json),
    },
    req.label,
  );
}

function sarvamCostUsd(data: CompletionResponse): number | undefined {
  const u = data.usage;
  if (!u) return undefined;
  const { input, output } = LLM.sarvam.inrPerMillion;
  const inr = ((u.prompt_tokens ?? 0) * input + (u.completion_tokens ?? 0) * output) / 1e6;
  return inr / LLM.sarvam.inrPerUsd;
}

function extractText(provider: Provider, data: CompletionResponse, req: BaseRequest, started: number): string {
  const choice = data.choices?.[0];
  logger.info("llm.call", {
    label: req.label,
    provider,
    model: data.model,
    finish: choice?.finish_reason,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
    costUsd: provider === "sarvam" ? sarvamCostUsd(data) : data.usage?.cost,
    ms: Date.now() - started,
  });
  if (choice?.message?.refusal) throw new GenerationError(`${req.label}: model declined`, "refusal");
  if (choice?.finish_reason === "length") throw new GenerationError(`${req.label}: output truncated`, "max_tokens");
  const text = (choice?.message?.content ?? "").trim();
  if (!text) throw new GenerationError(`${req.label}: empty response`, "empty");
  return text;
}

/**
 * One generation: Sarvam for its languages, otherwise OpenRouter. `validate` runs on the text so a
 * malformed Sarvam answer also falls back to OpenRouter instead of failing the user's request.
 */
async function complete<T>(req: BaseRequest, validate: (text: string) => T, json?: JsonSchemaFormat): Promise<T> {
  if (req.preferSarvam || (req.language && LLM.sarvam.languages.includes(req.language))) {
    const started = Date.now();
    try {
      return validate(extractText("sarvam", await callSarvam(req, json), req, started));
    } catch (err) {
      logger.warn("llm.sarvam_fallback", { label: req.label, err: err instanceof Error ? err.message : String(err) });
    }
  }
  const started = Date.now();
  return validate(extractText("openrouter", await callOpenRouter(req, json), req, started));
}

function parseJsonText(text: string): unknown {
  // Some models wrap JSON in code fences or add a sentence around it; take the outermost object.
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.indexOf("{");
    const end = unfenced.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(unfenced.slice(start, end + 1));
    throw new Error("not JSON");
  }
}

/** Structured generation: the response is constrained to and validated against `schema`. */
export async function generateJson<S extends z.ZodType>(req: BaseRequest & { schema: S; schemaName: string }): Promise<z.infer<S>> {
  const schema = z.toJSONSchema(req.schema, { target: "draft-7" }) as Record<string, unknown>;
  return complete(
    req,
    (text) => {
      let parsed: unknown;
      try {
        parsed = parseJsonText(text);
      } catch {
        throw new GenerationError(`${req.label}: response was not JSON`, "parse");
      }
      const result = req.schema.safeParse(parsed);
      if (!result.success) {
        // Field paths and zod messages only, never the generated text itself.
        const issues = result.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
        throw new GenerationError(`${req.label}: response did not match schema (${issues.join("; ")})`, "parse");
      }
      return result.data;
    },
    { name: req.schemaName, schema },
  );
}

/** Free-text generation (chat replies, notification copy). */
export async function generateText(req: BaseRequest): Promise<string> {
  return complete(req, (text) => text);
}
