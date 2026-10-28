import "server-only"

import Anthropic from "@anthropic-ai/sdk"

import { ASSISTANT_MODEL } from "./assistant-config"
import { anthropicScreeningPayload, evaluateScreening, parseClassification, type PrivacyClassification, type SanitizedNeed, type ScreeningDecision } from "./privacy-screening-core"
import { PRIVACY_SCREENING_PROMPT } from "./privacy-screening-prompt"
import type { NewRequestOutput } from "./validation"

export type ScreenableNeed = Pick<NewRequestOutput, "items" | "dietaryNotes" | "neighborhood">

let client: Anthropic | null = null

function log(result: "none" | "flagged", code?: string) {
  // Never log the submitted text, model output, prompt, account, or API error message.
  console.info(`[privacy-screen] result=${result}${code ? ` code=${code}` : ""}`)
}

async function classify(need: SanitizedNeed): Promise<PrivacyClassification | Extract<ScreeningDecision, { kind: "unavailable" }>> {
  if (!process.env.ANTHROPIC_API_KEY) return { kind: "unavailable", code: "missing_key" }
  try {
    client ??= new Anthropic()
    const response = await client.messages.create(
      {
        model: ASSISTANT_MODEL,
        max_tokens: 450,
        thinking: { type: "disabled" },
        system: PRIVACY_SCREENING_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(anthropicScreeningPayload(need)) }],
      },
      { timeout: 10_000, maxRetries: 0 }
    )
    if (response.stop_reason !== "end_turn") return { kind: "unavailable", code: "invalid_response" }
    const output = response.content.flatMap((part) => part.type === "text" ? [part.text] : []).join("").trim()
    let parsed: unknown
    try { parsed = JSON.parse(output) } catch { return { kind: "unavailable", code: "invalid_response" } }
    return parseClassification(parsed) ?? { kind: "unavailable", code: "invalid_response" }
  } catch (error) {
    const code = error instanceof Anthropic.APIConnectionTimeoutError
      ? "timeout"
      : error instanceof Anthropic.RateLimitError
        ? "rate_limit"
        : "api_error"
    return { kind: "unavailable", code }
  }
}

export async function screenNeed(input: ScreenableNeed): Promise<ScreeningDecision> {
  return evaluateScreening(input, classify, log)
}
