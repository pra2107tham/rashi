import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { generateJson, generateText } from "../../src/lib/llm";
import { readingSchema } from "../../src/prompts/reading";

const fetchMock = vi.fn();

function reply(content: string, status = 200, extra: object = {}) {
  return new Response(
    JSON.stringify({ model: "google/gemini-flash", choices: [{ message: { content }, finish_reason: "stop" }], usage: { cost: 0.0001 }, ...extra }),
    { status },
  );
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "sk-or-test";
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

const base = { system: "sys", messages: [{ role: "user" as const, content: "hi" }], maxTokens: 100, label: "t" };

describe("OpenRouter client", () => {
  it("routes through the auto router at the low cost tier with a price ceiling", async () => {
    fetchMock.mockResolvedValue(reply("Hello"));
    expect(await generateText({ ...base, sessionId: "chat-u1" })).toBe("Hello");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-or-test");
    const body = JSON.parse(init.body);
    expect(body.model).toBe("openrouter/auto");
    expect(body.plugins).toContainEqual({ id: "auto-router", cost_tier: "low" });
    expect(body.provider).toEqual({ require_parameters: true, max_price: { prompt: 1, completion: 4 } });
    expect(body.messages[0]).toEqual({ role: "system", content: "sys" });
    expect(body.session_id).toBe("chat-u1");
    expect(body.reasoning).toEqual({ effort: "low", exclude: true });
  });

  it("requests strict JSON schema output and validates the result", async () => {
    fetchMock.mockResolvedValue(reply('```json\n{"answer": 42}\n```'));
    const out = await generateJson({ ...base, schema: z.object({ answer: z.number() }), schemaName: "a" });
    expect(out).toEqual({ answer: 42 });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema).toMatchObject({ name: "a", strict: true });
    expect(body.plugins).toContainEqual({ id: "response-healing" });
  });

  it("produces strict-mode-compatible schemas (closed objects, all fields required)", () => {
    const schema = z.toJSONSchema(readingSchema, { target: "draft-7" }) as Record<string, unknown>;
    expect(schema.additionalProperties).toBe(false);
    expect(schema.required).toEqual(Object.keys(schema.properties as object));
  });

  it("rejects output that doesn't match the schema", async () => {
    fetchMock.mockResolvedValue(reply('{"answer": "nope"}'));
    await expect(generateJson({ ...base, schema: z.object({ answer: z.number() }), schemaName: "a" }))
      .rejects.toMatchObject({ reason: "parse" });
  });

  it("retries 429 and 5xx but not 4xx", async () => {
    fetchMock.mockResolvedValueOnce(reply("", 429)).mockResolvedValueOnce(reply("ok"));
    expect(await generateText(base)).toBe("ok");

    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ error: { message: "bad" } }), { status: 400 }));
    await expect(generateText(base)).rejects.toMatchObject({ reason: "http" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("doesn't retry a call that timed out", async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error("timed out"), { name: "TimeoutError" }));
    await expect(generateText(base)).rejects.toThrow("timed out");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats truncated output as an error", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: "partial" }, finish_reason: "length" }] })),
    );
    await expect(generateText(base)).rejects.toMatchObject({ reason: "max_tokens" });
  });
});
