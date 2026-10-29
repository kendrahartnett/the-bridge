import { createHmac, timingSafeEqual } from "node:crypto"

import { scanChatText, type ChatSensitiveCategory, type ChatTextScan } from "./chat-content-safety.ts"
import { isCrisisMessage } from "./chat-crisis.ts"
import { MAX_USER_MESSAGES } from "./assistant-config.ts"

export type ChatMessage = { role: "user" | "assistant"; content: string }
export type ChatState = { messages: ChatMessage[]; turnCount: number }
export type ChatFailure = "invalid" | "expired" | "replay" | "busy" | "session_limit" | "privacy_blocked"

// 42k allows nine full prior turns plus a 500-character tenth question.
export const CHAT_MAX_TOTAL_CHARS = 42_000
export const CHAT_MAX_ASSISTANT_MESSAGE_CHARS = 4_000
export const CHAT_MAX_BODY_BYTES = 64 * 1024
export const CHAT_COOKIE_NAME = "bridge_chat_session"

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
    const protocol = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.slice(0, -1)
    if (!host || !["http", "https"].includes(protocol)) return false
    return new URL(origin).origin === `${protocol}://${host}`
  } catch {
    return false
  }
}

export function canAskMore(turnCount: number) {
  return Number.isInteger(turnCount) && turnCount >= 0 && turnCount < MAX_USER_MESSAGES
}

export async function readBoundedJson(request: Request): Promise<unknown | null> {
  const length = Number(request.headers.get("content-length"))
  if (Number.isFinite(length) && length > CHAT_MAX_BODY_BYTES) return null
  if (!request.body) return null
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > CHAT_MAX_BODY_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

export function validateChatTurn(value: unknown): { messages: ChatMessage[]; question: string; expectedTurn: number } | null {
  if (!value || typeof value !== "object") return null
  const body = value as Record<string, unknown>
  if (!Array.isArray(body.messages) || body.messages.length > 20) return null
  if (typeof body.question !== "string" || body.question.length > 500 || !body.question.trim()) return null
  if (typeof body.expectedTurn !== "number" || !Number.isSafeInteger(body.expectedTurn) || body.expectedTurn < 0 || body.expectedTurn > 10) return null
  const messages: ChatMessage[] = []
  let chars = body.question.length
  for (const item of body.messages) {
    if (!item || typeof item !== "object") return null
    const message = item as Record<string, unknown>
    if ((message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string") return null
    if (message.content.length > (message.role === "user" ? 500 : CHAT_MAX_ASSISTANT_MESSAGE_CHARS)) return null
    chars += message.content.length
    messages.push({ role: message.role, content: message.content })
  }
  if (chars > CHAT_MAX_TOTAL_CHARS || messages.length !== body.expectedTurn * 2) return null
  if (messages.some((message, i) => message.role !== (i % 2 === 0 ? "user" : "assistant"))) return null
  if (messages.some((message) => !message.content.trim())) return null
  return { messages, question: body.question.trim(), expectedTurn: body.expectedTurn as number }
}

export function transcriptDigest(secret: string, messages: ChatMessage[]) {
  return createHmac("sha256", secret).update("bridge-chat-transcript-v1\0").update(JSON.stringify(messages)).digest("hex")
}

export function rateLimitIdentifier(secret: string, trustedIp: string) {
  return createHmac("sha256", secret).update("bridge-chat-rate-ip-v1\0").update(trustedIp).digest("hex")
}

export function safeDigestEqual(left: string, right: string) {
  if (!/^[a-f\d]{64}$/i.test(left) || !/^[a-f\d]{64}$/i.test(right)) return false
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"))
}

export function matchesSessionTranscript(messages: ChatMessage[], expectedTurn: number, storedTurn: number, storedDigest: string, secret: string) {
  return expectedTurn === storedTurn && safeDigestEqual(transcriptDigest(secret, messages), storedDigest)
}

/** Every role is checked. Any recognized sensitive span blocks the whole outbound turn. */
export function screenChatForProvider(
  messages: ChatMessage[],
  question: string,
  scan?: ChatTextScan
): { ok: true } | { ok: false; reason: "crisis"; categories: ChatSensitiveCategory[] } | { ok: false; reason: "privacy"; categories: ChatSensitiveCategory[]; historySensitive: boolean } {
  const categories = new Set<ChatSensitiveCategory>()
  let historySensitive = false
  const transcript = [...messages, { role: "user" as const, content: question }]
  for (const [index, message] of transcript.entries()) {
    if (isCrisisMessage(message.content)) return { ok: false, reason: "crisis", categories: [] }
    const result = scanChatText(message.content, scan)
    if (result.kind === "crisis") return { ok: false, reason: "crisis", categories: [] }
    if (result.kind === "sensitive") {
      if (index < messages.length) historySensitive = true
      for (const category of result.categories) categories.add(category)
    }
  }
  return categories.size ? { ok: false, reason: "privacy", categories: [...categories], historySensitive } : { ok: true }
}

/** The route sends only this result to Anthropic; a failed screen has no payload to forward. */
export function prepareAnthropicMessages(
  history: ChatMessage[],
  question: string,
  scan?: ChatTextScan
): { ok: true; messages: ChatMessage[] } | { ok: false; reason: "crisis"; categories: ChatSensitiveCategory[] } | { ok: false; reason: "privacy"; categories: ChatSensitiveCategory[]; historySensitive: boolean } {
  const screened = screenChatForProvider(history, question, scan)
  return screened.ok
    ? { ok: true, messages: [...history, { role: "user", content: question }] }
    : screened
}

export async function callWithPreparedAnthropicMessages<T>(
  prepared: ReturnType<typeof prepareAnthropicMessages>,
  send: (messages: ChatMessage[]) => Promise<T>
): Promise<{ kind: "blocked"; decision: Exclude<ReturnType<typeof prepareAnthropicMessages>, { ok: true }> } | { kind: "sent"; result: T }> {
  if (!prepared.ok) return { kind: "blocked", decision: prepared }
  return { kind: "sent", result: await send(prepared.messages) }
}

export async function withChatFallback<T>(
  operation: () => Promise<T>,
  fallback: string,
  normalize: (value: T) => string
): Promise<{ text: string; source: "assistant" | "fallback"; failure?: unknown }> {
  try {
    const text = normalize(await operation()).trim()
    return text ? { text, source: "assistant" } : { text: fallback, source: "fallback" }
  } catch (failure) {
    return { text: fallback, source: "fallback", failure }
  }
}
