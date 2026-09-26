import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as logger from "firebase-functions/logger";
import type { z } from "zod";
import { ANTHROPIC_API_KEY } from "../config";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: ANTHROPIC_API_KEY.value(), maxRetries: 2, timeout: 25_000 });
  return client;
}

export class GenerationError extends Error {
  constructor(message: string, readonly reason: "refusal" | "max_tokens" | "parse" | "empty") {
    super(message);
  }
}

type Effort = "low" | "medium" | "high";

interface BaseRequest {
  model: string;
  /** Static instructions; cached so repeat calls only pay for the variable part. */
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens: number;
  /** Omit for models that don't support effort (e.g. Haiku 4.5). */
  effort?: Effort;
  /** Short label for logs, e.g. "reading:today". Never include personal data. */
  label: string;
}

function baseParams(req: BaseRequest) {
  return {
    model: req.model,
    max_tokens: req.maxTokens,
    system: [{ type: "text" as const, text: req.system, cache_control: { type: "ephemeral" as const } }],
    messages: req.messages,
  };
}

function checkStop(res: Anthropic.Message, label: string): void {
  const u = res.usage;
  logger.info("claude.call", {
    label,
    model: res.model,
    stop: res.stop_reason,
    inputTokens: u.input_tokens,
    outputTokens: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
  });
  if (res.stop_reason === "refusal") throw new GenerationError(`${label}: model declined`, "refusal");
  if (res.stop_reason === "max_tokens") throw new GenerationError(`${label}: output truncated`, "max_tokens");
}

/** Structured generation: the response is constrained to and validated against `schema`. */
export async function generateJson<S extends z.ZodType>(req: BaseRequest & { schema: S }): Promise<z.infer<S>> {
  const started = Date.now();
  const res = await getClient().messages.parse({
    ...baseParams(req),
    output_config: {
      format: zodOutputFormat(req.schema),
      ...(req.effort ? { effort: req.effort } : {}),
    },
  });
  logger.debug("claude.latency", { label: req.label, ms: Date.now() - started });
  checkStop(res, req.label);
  if (res.parsed_output == null) throw new GenerationError(`${req.label}: unparseable output`, "parse");
  return res.parsed_output as z.infer<S>;
}

/** Free-text generation (chat replies, notification copy). */
export async function generateText(req: BaseRequest): Promise<string> {
  const started = Date.now();
  const res = await getClient().messages.create({
    ...baseParams(req),
    ...(req.effort ? { output_config: { effort: req.effort } } : {}),
  });
  logger.debug("claude.latency", { label: req.label, ms: Date.now() - started });
  checkStop(res, req.label);
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!text) throw new GenerationError(`${req.label}: empty response`, "empty");
  return text;
}
