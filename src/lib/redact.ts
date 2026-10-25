// Keeps secrets out of script output: connection strings, passwords, API keys, and full
// database URLs never reach the terminal, even inside error messages or stack traces.
// Scripts call installRedaction() first; anything they print afterwards is filtered.
// Relative imports only, so Node can load this outside Next.js.

import { inspect } from "node:util"

/** Environment variables whose values are always secret. */
const SECRET_ENV = ["DATABASE_URL", "NEON_AUTH_COOKIE_SECRET", "ANTHROPIC_API_KEY", "SEED_TEST_PASSWORD"]

// Shapes that are secret wherever they appear, even if we were never told the value.
const PATTERNS: [RegExp, string][] = [
  [/postgres(?:ql)?:\/\/[^\s'"`]+/gi, "[database URL]"],
  [/\bnpg_[A-Za-z0-9]{6,}/g, "[password]"],
  [/\bsk-ant-[A-Za-z0-9_-]{6,}/g, "[API key]"],
  // user:password@ inside any other URL
  [/(\/\/[^\s:/@'"`]+:)[^\s@/'"`]+@/g, "$1[password]@"],
]

const extra = new Set<string>()

/** Registers a secret read from somewhere other than the environment (e.g. .env.prod.local). */
export function addSecret(value: string | undefined) {
  if (!value || value.length < 6) return
  extra.add(value)
  // A URL's password can also turn up on its own in error messages.
  try {
    const password = decodeURIComponent(new URL(value).password)
    if (password.length >= 6) extra.add(password)
  } catch {
    // not a URL
  }
}

/** The text with every known secret, and anything shaped like one, replaced. */
export function redact(text: string): string {
  for (const key of SECRET_ENV) addSecret(process.env[key])
  let out = text
  // Longest first, so a full URL is replaced before the password inside it.
  for (const secret of [...extra].sort((a, b) => b.length - a.length)) out = out.split(secret).join("[redacted]")
  for (const [pattern, replacement] of PATTERNS) out = out.replace(pattern, replacement)
  return out
}

const asText = (value: unknown) => (typeof value === "string" ? value : inspect(value, { depth: 6 }))

let installed = false

/**
 * Filters everything this process prints: console methods, direct writes to stdout and
 * stderr, and crashes (an uncaught error is printed redacted, then the script exits 1).
 */
export function installRedaction() {
  if (installed) return
  installed = true
  for (const method of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[method].bind(console)
    console[method] = (...args: unknown[]) => original(redact(args.map(asText).join(" ")))
  }
  for (const stream of [process.stdout, process.stderr]) {
    const write = stream.write.bind(stream) as (chunk: unknown, ...rest: unknown[]) => boolean
    stream.write = ((chunk: unknown, ...rest: unknown[]) =>
      write(typeof chunk === "string" ? redact(chunk) : chunk instanceof Uint8Array ? redact(Buffer.from(chunk).toString()) : chunk, ...rest)) as typeof stream.write
  }
  const crash = (error: unknown) => {
    console.error(error)
    process.exit(1)
  }
  process.on("uncaughtException", crash)
  process.on("unhandledRejection", crash)
}
