import { redact } from "@/lib/redact"

export type AuthFailure = { message?: string; status?: number; code?: string }

/**
 * A short, log-safe name for an auth failure. The auth SDK replaces many of Neon Auth's own
 * codes with generic ones (INVALID_ORIGIN arrives as "feature_not_supported"), but keeps
 * Neon Auth's fixed message, so the message's first sentence becomes the code: "Invalid
 * origin" → INVALID_ORIGIN, "User already exists. Use another email." → USER_ALREADY_EXISTS.
 * Only messages made of letters, spaces, and . , ' qualify (no @ or digits), so an email
 * address can never reach the log.
 */
export function failureCode({ message, code }: AuthFailure) {
  if (message && /^[A-Za-z .,']{1,120}$/.test(message)) {
    const first = message.split(".")[0].replace(/[,']/g, "").trim()
    if (first) return first.toUpperCase().replaceAll(" ", "_")
  }
  return code?.toUpperCase() ?? "UNKNOWN"
}

/**
 * Logs that an /admin access check couldn't finish: the failure code and HTTP status only,
 * passed through the secret redaction. Never the message (it can carry a connection
 * string or an email), the cookie, or the session.
 */
export function logAdminLookupFailure(step: "session" | "account", error: unknown) {
  const e = (typeof error === "object" && error !== null ? error : {}) as AuthFailure & { name?: string }
  let code = failureCode({ code: e.code, message: e.message })
  // A thrown error without a code or a log-safe message (a network or database error):
  // its class name, such as TypeError or NeonDbError.
  if (code === "UNKNOWN" && e.name) code = e.name
  console.error(redact(`[admin] ${step} lookup failed: ${code} (HTTP ${e.status ?? "?"})`))
}
