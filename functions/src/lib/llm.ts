import * as logger from "firebase-functions/logger";
import { z } from "zod";
import { LLM, OPENROUTER_API_KEY } from "../config";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
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
  /** Keeps a multi-turn conversation on the same routed model and provider. */
  sessionId?: string;
}

interface OpenRouterResponse {
  model?: string;
  choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string | null }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
    completion_tokens_details?: { reasoning_tokens?: number };
  };
  error?: { message?: string; code?: number };
}

async function post(body: Record<string, unknown>, label: string): Promise<OpenRouterResponse> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY.value()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": LLM.appUrl,
          "X-Title": LLM.appName,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const data = (await res.json().catch(() => ({}))) as OpenRouterResponse;
      if (res.ok && !data.error) return data;
      lastErr = new GenerationError(`${label}: HTTP ${res.status} ${data.error?.message ?? ""}`.trim(), "http");
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

/**
 * One call through OpenRouter's Auto Router. It picks a model from the cheapest cost band that
 * supports every parameter we send, with a hard per-token price ceiling as a safety net.
 */
async function complete(req: BaseRequest, extra: Record<string, unknown> = {}): Promise<{ text: string; data: OpenRouterResponse }> {
  const started = Date.now();
  const data = await post(
    {
      model: LLM.model,
      messages: [{ role: "system", content: req.system }, ...req.messages],
      max_tokens: req.maxTokens,
      reasoning: LLM.reasoning,
      plugins: [{ id: "auto-router", cost_tier: LLM.costTier }, ...((extra.plugins as unknown[]) ?? [])],
      provider: { require_parameters: true, max_price: LLM.maxPricePerMillion },
      ...(req.sessionId ? { session_id: req.sessionId } : {}),
      ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "plugins")),
    },
    req.label,
  );

  const choice = data.choices?.[0];
  logger.info("llm.call", {
    label: req.label,
    model: data.model,
    finish: choice?.finish_reason,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens,
    costUsd: data.usage?.cost,
    ms: Date.now() - started,
  });
  if (choice?.message?.refusal) throw new GenerationError(`${req.label}: model declined`, "refusal");
  if (choice?.finish_reason === "length") throw new GenerationError(`${req.label}: output truncated`, "max_tokens");
  const text = (choice?.message?.content ?? "").trim();
  if (!text) throw new GenerationError(`${req.label}: empty response`, "empty");
  return { text, data };
}

function parseJsonText(text: string): unknown {
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}

/** Structured generation: the response is constrained to and validated against `schema`. */
export async function generateJson<S extends z.ZodType>(req: BaseRequest & { schema: S; schemaName: string }): Promise<z.infer<S>> {
  const jsonSchema = z.toJSONSchema(req.schema, { target: "draft-7" });
  const { text } = await complete(req, {
    response_format: { type: "json_schema", json_schema: { name: req.schemaName, strict: true, schema: jsonSchema } },
    plugins: [{ id: "response-healing" }],
  });
  let parsed: unknown;
  try {
    parsed = parseJsonText(text);
  } catch {
    throw new GenerationError(`${req.label}: response was not JSON`, "parse");
  }
  const result = req.schema.safeParse(parsed);
  if (!result.success) throw new GenerationError(`${req.label}: response did not match schema`, "parse");
  return result.data;
}

/** Free-text generation (chat replies, notification copy). */
export async function generateText(req: BaseRequest): Promise<string> {
  return (await complete(req)).text;
}
