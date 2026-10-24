// Assistant limits shared by the chat route (enforcement) and the chat panel (instant
// feedback). Safe to import in the browser: no secrets, no prompt text.

export const ASSISTANT_MODEL = "claude-haiku-5-5"
export const ASSISTANT_MAX_TOKENS = 400
export const ASSISTANT_TIMEOUT_MS = 15_000

/** Longest message a person can send. */
export const MAX_MESSAGE_CHARS = 500
/** Most messages a person can send in one chat session (the session lives in the browser). */
export const MAX_USER_MESSAGES = 10
/** Requests allowed per IP address per hour. */
export const RATE_LIMIT_PER_HOUR = 20
