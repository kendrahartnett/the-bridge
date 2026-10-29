import Anthropic from "@anthropic-ai/sdk"
import { cookies } from "next/headers"
import { isIP } from "node:net"

import {
  ASSISTANT_MAX_TOKENS,
  ASSISTANT_MODEL,
  ASSISTANT_TIMEOUT_MS,
  MAX_MESSAGE_CHARS,
  RATE_LIMIT_PER_HOUR,
} from "@/lib/assistant-config"
import { ASSISTANT_SYSTEM_PROMPT } from "@/lib/assistant-prompt"
import { collapseNestedParentheses, stripSpanishLabels, trimToLastSentence } from "@/lib/assistant-reply"
import { isCrisisMessage } from "@/lib/chat-crisis"
import { callWithPreparedAnthropicMessages, canAskMore, CHAT_COOKIE_NAME, CHAT_MAX_ASSISTANT_MESSAGE_CHARS, isSameOriginRequest, matchesSessionTranscript, prepareAnthropicMessages, rateLimitIdentifier, readBoundedJson, screenChatForProvider, transcriptDigest, validateChatTurn, withChatFallback } from "@/lib/chat-security-core"
import { copyFor } from "@/lib/copy"
import { requestLang } from "@/lib/i18n-server"
import { admitChatRequest, chatSecret, createChatSession, finalizeChatTurn, newSessionToken, readChatSession, reserveChatTurn } from "@/lib/chat-session-store"

const NO_STORE = { "Cache-Control": "no-store" }
type ErrorCode = "too_long" | "empty" | "session_limit" | "rate_limited" | "invalid" | "privacy" | "expired" | "busy"

function error(code: ErrorCode, message: string, status: number, headers: HeadersInit = {}, extra: Record<string, unknown> = {}) {
  return Response.json({ error: message, code, ...extra }, { status, headers: { ...NO_STORE, ...headers } })
}

function success(text: string, source: "assistant" | "fallback", token?: string) {
  const headers = new Headers(NO_STORE)
  if (token) headers.set("Set-Cookie", sessionCookie(token))
  return Response.json({ reply: text, source }, { headers })
}

function crisisResponse(message: string) {
  return Response.json(
    { reply: message, source: "safety" },
    { headers: { ...NO_STORE, "Set-Cookie": sessionCookie("", true) } }
  )
}

function sessionCookie(token: string, clear = false) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${CHAT_COOKIE_NAME}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : 86400}${secure}`
}

/** Vercel overwrites this header at its edge. Do not parse arbitrary forwarded chains. */
function trustedClientIp(request: Request) {
  const candidate = request.headers.get("x-vercel-forwarded-for")?.trim()
  if (candidate && !candidate.includes(",") && isIP(candidate)) return candidate
  if (process.env.NODE_ENV !== "production") return "127.0.0.1"
  return null
}

let client: Anthropic | null = null

export async function POST(request: Request) {
  const { ASSISTANT_COPY } = copyFor(await requestLang())
  if (!isSameOriginRequest(request)) return error("invalid", ASSISTANT_COPY.errors.invalid, 403)

  const json = await readBoundedJson(request)
  const turn = validateChatTurn(json)
  if (!turn) return error("invalid", ASSISTANT_COPY.errors.invalid, 400)
  if (turn.question.length > MAX_MESSAGE_CHARS) return error("too_long", ASSISTANT_COPY.errors.tooLong, 400)
  if (!turn.question.trim()) return error("empty", ASSISTANT_COPY.errors.empty, 400)

  // Crisis guidance is deterministic, does not need a session or secret, and never sends
  // the submitted text to Anthropic or persists it in the transcript.
  if (isCrisisMessage(turn.question)) return crisisResponse(ASSISTANT_COPY.crisisReply)

  const ip = trustedClientIp(request)
  if (!ip) return error("invalid", ASSISTANT_COPY.errors.invalid, 503)

  let secret: string
  try {
    secret = chatSecret()
  } catch {
    console.error("[chat] configuration_error: chat_secret_unavailable")
    return error("invalid", ASSISTANT_COPY.errors.invalid, 503)
  }

  // Every send consumes durable per-IP quota, including failed provider calls and PII blocks.
  try {
    if (!(await admitChatRequest(rateLimitIdentifier(secret, ip), RATE_LIMIT_PER_HOUR))) {
      return error("rate_limited", ASSISTANT_COPY.errors.rateLimited, 429, { "Retry-After": "3600" })
    }
  } catch {
    console.error("[chat] rate_limit_error: storage_unavailable")
    return error("invalid", ASSISTANT_COPY.errors.invalid, 503)
  }

  if (!canAskMore(turn.expectedTurn)) {
    return error("session_limit", ASSISTANT_COPY.errors.sessionLimit, 409)
  }

  const cookieStore = await cookies()
  let token = cookieStore.get(CHAT_COOKIE_NAME)?.value
  let newSession = false
  if (!token) {
    if (turn.expectedTurn !== 0 || turn.messages.length !== 0) return error("expired", ASSISTANT_COPY.errors.sessionExpired, 409)
    token = newSessionToken()
    try {
      await createChatSession(token, secret)
      newSession = true
    } catch {
      console.error("[chat] session_error: create_failed")
      return error("invalid", ASSISTANT_COPY.errors.invalid, 503)
    }
  } else if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return error("expired", ASSISTANT_COPY.errors.sessionExpired, 409)
  }

  const expectedDigest = transcriptDigest(secret, turn.messages)
  try {
    const session = await readChatSession(token)
    if (!session) return error("expired", ASSISTANT_COPY.errors.sessionExpired, 409, newSession ? { "Set-Cookie": sessionCookie(token) } : {})
    if (!matchesSessionTranscript(turn.messages, turn.expectedTurn, session.turn_count, session.transcript_hmac, secret)) {
      return error("invalid", ASSISTANT_COPY.errors.staleConversation, 409)
    }
  } catch {
    console.error("[chat] session_error: read_failed")
    return error("invalid", ASSISTANT_COPY.errors.invalid, 503, newSession ? { "Set-Cookie": sessionCookie(token) } : {})
  }
  // Local scanner errors and every recognized identifier fail closed before provider access.
  let prepared: ReturnType<typeof prepareAnthropicMessages>
  try {
    prepared = prepareAnthropicMessages(turn.messages, turn.question)
    if (!prepared.ok && prepared.reason === "crisis") return crisisResponse(ASSISTANT_COPY.crisisReply)
    if (!prepared.ok) {
      const resetConversation = prepared.historySensitive
      return error(
        "privacy",
        ASSISTANT_COPY.errors.privacyBlocked,
        422,
        resetConversation ? { "Set-Cookie": sessionCookie("", true) } : newSession ? { "Set-Cookie": sessionCookie(token) } : {},
        resetConversation ? { resetConversation: true } : {}
      )
    }
  } catch {
    console.error("[chat] privacy_error: local_scan_failed")
    return error("privacy", ASSISTANT_COPY.errors.privacyBlocked, 422, newSession ? { "Set-Cookie": sessionCookie(token) } : {})
  }

  let reservation
  try {
    reservation = await reserveChatTurn(token, turn.expectedTurn, expectedDigest)
  } catch {
    console.error("[chat] reservation_error: storage_unavailable")
    return error("invalid", ASSISTANT_COPY.errors.invalid, 503, newSession ? { "Set-Cookie": sessionCookie(token) } : {})
  }
  if (!reservation.ok) {
    const reason = reservation.reason
    if (reason === "expired") return error("expired", ASSISTANT_COPY.errors.sessionExpired, 409)
    if (reason === "busy") return error("busy", ASSISTANT_COPY.errors.requestPending, 409)
    return error("invalid", ASSISTANT_COPY.errors.staleConversation, 409)
  }

  let answer = ASSISTANT_COPY.fallback
  let source: "assistant" | "fallback" = "fallback"

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[chat] provider_unavailable: missing_api_key")
  } else {
    const providerCall = await callWithPreparedAnthropicMessages(prepared, async (sentMessages) => withChatFallback(
      async () => {
        client ??= new Anthropic()
        return client.messages.create(
          {
            model: ASSISTANT_MODEL,
            max_tokens: ASSISTANT_MAX_TOKENS,
            thinking: { type: "disabled" },
            system: ASSISTANT_SYSTEM_PROMPT,
            messages: sentMessages.map((message) => ({ role: message.role, content: message.content })),
          },
          { timeout: ASSISTANT_TIMEOUT_MS, maxRetries: 0 }
        )
      },
      ASSISTANT_COPY.fallback,
      (response) => {
        if (response.stop_reason === "refusal") return ""
        let text = response.content.flatMap((block) => block.type === "text" ? [block.text] : []).join("\n").trim()
        if (response.stop_reason === "max_tokens") text = trimToLastSentence(text)
        text = collapseNestedParentheses(stripSpanishLabels(text))
        if (text.length > CHAT_MAX_ASSISTANT_MESSAGE_CHARS) text = trimToLastSentence(text.slice(0, CHAT_MAX_ASSISTANT_MESSAGE_CHARS))
        return text && screenChatForProvider([], text).ok ? text : ""
      }
    ))
    if (providerCall.kind === "blocked") {
      if (providerCall.decision.reason === "crisis") return crisisResponse(ASSISTANT_COPY.crisisReply)
      return error("privacy", ASSISTANT_COPY.errors.privacyBlocked, 422)
    }
    const result = providerCall.result
    answer = result.text
    source = result.source
    if (result.failure) {
      const err = result.failure
      const kind = err instanceof Anthropic.APIConnectionTimeoutError ? "timeout" : err instanceof Anthropic.APIError ? `provider_status_${err.status ?? "unknown"}` : "unexpected"
      console.error(`[chat] provider_error: ${kind}`)
    }
  }

  try {
    if (!(await finalizeChatTurn(token, reservation.reservationId, turn.expectedTurn, prepared.messages, answer, secret))) {
      return error("expired", ASSISTANT_COPY.errors.sessionExpired, 409)
    }
  } catch {
    console.error("[chat] finalization_error: storage_unavailable")
    return error("invalid", ASSISTANT_COPY.errors.invalid, 503)
  }

  return success(answer, source, newSession ? token : undefined)
}
