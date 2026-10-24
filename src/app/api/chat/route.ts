import Anthropic from "@anthropic-ai/sdk"
import { z } from "zod"

import {
  ASSISTANT_MAX_TOKENS,
  ASSISTANT_MODEL,
  ASSISTANT_TIMEOUT_MS,
  MAX_MESSAGE_CHARS,
  MAX_USER_MESSAGES,
  RATE_LIMIT_PER_HOUR,
} from "@/lib/assistant-config"
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant-prompt"
import { stripSpanishLabels, trimToLastSentence } from "@/lib/assistant-reply"
import { ASSISTANT_COPY } from "@/lib/copy"
import { clientIp, rateLimit } from "@/lib/rate-limit"

// The assistant. The browser keeps the chat (up to 10 questions) and sends it each time;
// nothing is stored on the server, and message text is never logged. The API key and the
// system prompt stay on the server.

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) }))
    .min(1)
    // Loose size bound only; the 10-question limit is checked below so people get the
    // clear "limit reached" message rather than a generic error.
    .max(MAX_USER_MESSAGES * 4),
})

type ErrorCode = "too_long" | "empty" | "session_limit" | "rate_limited" | "invalid"

function error(code: ErrorCode, message: string, status: number, headers: HeadersInit = {}) {
  return Response.json({ error: message, code }, { status, headers: { "Cache-Control": "no-store", ...headers } })
}

function reply(text: string, source: "assistant" | "fallback") {
  return Response.json({ reply: text, source }, { headers: { "Cache-Control": "no-store" } })
}

let client: Anthropic | null = null

export async function POST(request: Request) {
  // 1. Rate limit every request, before doing any work.
  const limited = rateLimit(`chat:${clientIp(request.headers)}`, RATE_LIMIT_PER_HOUR)
  if (!limited.ok) {
    return error("rate_limited", ASSISTANT_COPY.errors.rateLimited, 429, {
      "Retry-After": String(limited.retryAfterSeconds),
    })
  }

  // 2. Validate the conversation the browser sent.
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return error("invalid", ASSISTANT_COPY.errors.invalid, 400)
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return error("invalid", ASSISTANT_COPY.errors.invalid, 400)
  const messages = parsed.data.messages

  // Turns must alternate user/assistant and end with the user's new question.
  const alternates = messages.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant"))
  if (!alternates || messages.at(-1)?.role !== "user") {
    return error("invalid", ASSISTANT_COPY.errors.invalid, 400)
  }
  const userMessages = messages.filter((m) => m.role === "user")
  if (userMessages.length > MAX_USER_MESSAGES) {
    return error("session_limit", ASSISTANT_COPY.errors.sessionLimit, 400)
  }
  if (userMessages.some((m) => m.content.length > MAX_MESSAGE_CHARS)) {
    return error("too_long", ASSISTANT_COPY.errors.tooLong, 400)
  }
  if (!messages.at(-1)!.content.trim()) {
    return error("empty", ASSISTANT_COPY.errors.empty, 400)
  }

  // 3. Ask Claude. Any failure, timeout, or refusal returns the friendly fallback.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[chat] ANTHROPIC_API_KEY is not set; returning the fallback reply.")
    return reply(ASSISTANT_COPY.fallback, "fallback")
  }
  client ??= new Anthropic() // reads ANTHROPIC_API_KEY from the environment

  try {
    const response = await client.messages.create(
      {
        model: ASSISTANT_MODEL,
        max_tokens: ASSISTANT_MAX_TOKENS,
        // Haiku 5.5 thinks by default and thinking counts toward max_tokens; turn it off so
        // all the tokens go to the answer.
        thinking: { type: "disabled" },
        system: ASSISTANT_SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      },
      // One attempt with a hard 15s ceiling (retries would push past it).
      { timeout: ASSISTANT_TIMEOUT_MS, maxRetries: 0 }
    )

    if (response.stop_reason === "refusal") return reply(ASSISTANT_COPY.fallback, "fallback")
    let text = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("\n")
      .trim()
    // Never show a reply that stops mid-sentence.
    if (response.stop_reason === "max_tokens") text = trimToLastSentence(text)
    text = stripSpanishLabels(text)
    return text ? reply(text, "assistant") : reply(ASSISTANT_COPY.fallback, "fallback")
  } catch (err) {
    // Log only the kind of failure: never message text, never the key.
    const kind =
      err instanceof Anthropic.APIConnectionTimeoutError
        ? "timeout"
        : err instanceof Anthropic.APIError
          ? `${err.constructor.name} ${err.status ?? ""}`.trim()
          : "unexpected error"
    console.error(`[chat] Anthropic request failed: ${kind}`)
    return reply(ASSISTANT_COPY.fallback, "fallback")
  }
}
