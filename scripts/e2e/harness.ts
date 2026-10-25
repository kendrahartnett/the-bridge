// Shared setup for the browser test suites in scripts/e2e (see scripts/e2e/README.md).
//
// The suites sign in as the seeded test accounts and change data (offers, approvals), so they
// run only against the-bridge-dev and a local server:
//   - DATABASE_URL must be the-bridge-dev (requireDevDatabase checks the host and project).
//   - The base URL must be localhost; a deployed site is refused.
//   - Dev test data is reseeded before each suite and again when it ends, even after a crash.
//   - Only one suite or run at a time (lock.ts); every browser call, database query, and
//     reseed has a time limit, so a stall fails with the step's name instead of hanging.
// Nothing printed may contain a connection string or password (installRedaction).

import { neon } from "@neondatabase/serverless"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { join } from "node:path"

import { requireDevDatabase } from "../../src/db/dev-guard.ts"
import { installRedaction, redact } from "../../src/lib/redact.ts"
import { acquireLock } from "./lock.ts"

/** Rejects with "<step> got no reply within <n>s" if the promise takes longer than ms. */
export function withTimeout<T>(promise: Promise<T>, ms: number, step: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${step} got no reply within ${ms / 1000}s`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>

/** Tagged-template queries, each limited to 20 seconds. */
function timedSql(url: string): Sql {
  const query = neon(url)
  return (strings, ...values) => {
    const text = strings.join("$").replace(/\s+/g, " ").trim().slice(0, 70)
    return withTimeout(query(strings, ...values) as Promise<Record<string, unknown>[]>, 20_000, `Database query "${text}"`)
  }
}

export type Check = { name: string; ok: boolean; detail: string }

export type Suite = {
  name: string
  base: string
  password: string
  sql: Sql
  /** Screenshots and results.json go here (test-results/e2e/<suite>, git-ignored). */
  outDir: string
  /** Command-line flags after the script name, e.g. --widths=320,390 → { widths: "320,390" }. */
  flags: Record<string, string | true>
  check: (name: string, ok: unknown, detail?: unknown) => boolean
  results: Check[]
}

function refuse(reason: string): never {
  console.error(`Refusing to run: ${reason}`)
  process.exit(1)
}

/** Puts the seeded test users and requests back to their starting state. Deletes nothing. */
export function reseed() {
  const r = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "src/db/seed.ts"], {
    encoding: "utf8",
    timeout: 120_000,
  })
  if (r.error) {
    console.error(`Reseeding the dev database didn't finish within 120s (${(r.error as NodeJS.ErrnoException).code}).`)
    process.exit(1)
  }
  const line = r.stdout.split("\n").find((l) => l.startsWith("seeded"))
  if (r.status !== 0 || !line) {
    console.error(redact(`Reseeding the dev database failed:\n${r.stdout}\n${r.stderr}`))
    process.exit(1)
  }
  console.log(line.trim())
}

export async function setup(name: string): Promise<Suite> {
  installRedaction()
  acquireLock(`e2e:${name}`)
  try {
    process.loadEnvFile(".env.local")
  } catch {
    // Use variables already in the environment.
  }
  const url = await withTimeout(requireDevDatabase(), 30_000, "Checking that DATABASE_URL is the-bridge-dev")

  const base = (process.env.E2E_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "")
  let host: string
  try {
    host = new URL(base).hostname
  } catch {
    refuse("E2E_BASE_URL isn't a valid URL.")
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) {
    refuse("browser tests run only against a local server (localhost), never a deployed site.")
  }
  try {
    await fetch(base, { redirect: "manual", signal: AbortSignal.timeout(15_000) })
  } catch {
    refuse(`no server at ${base}. Start one with: npm run build && npx next start -p 3100`)
  }

  const password = process.env.SEED_TEST_PASSWORD
  if (!password) refuse("SEED_TEST_PASSWORD is not set (the seeded test accounts' password).")

  const flags: Suite["flags"] = {}
  for (const arg of process.argv.slice(2)) {
    const m = arg.match(/^--([\w-]+)(?:=(.*))?$/)
    if (m) flags[m[1]] = m[2] ?? true
  }

  const outDir = join("test-results", "e2e", name)
  fs.rmSync(outDir, { recursive: true, force: true })
  fs.mkdirSync(outDir, { recursive: true })

  reseed()
  console.log(`Suite: ${name} · ${base}\n`)

  const results: Check[] = []
  const check = (name: string, ok: unknown, detail: unknown = "") => {
    const d = redact(typeof detail === "string" ? detail : JSON.stringify(detail) ?? "")
    results.push({ name, ok: !!ok, detail: d })
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${d ? "  — " + d : ""}`)
    return !!ok
  }
  return { name, base, password, sql: timedSql(url), outDir, flags, check, results }
}

/**
 * Ends a suite: records any crash and console errors as failures, writes results.json,
 * reseeds dev, prints the total, and exits non-zero if anything failed.
 */
export async function finish(
  suite: Suite,
  browser: { consoleErrors: string[]; close: () => void } | undefined,
  error?: unknown
): Promise<never> {
  if (error) suite.check("Run completed", false, error instanceof Error ? error.message : String(error))
  if (browser) {
    suite.check("No console errors or warnings", browser.consoleErrors.length === 0, browser.consoleErrors.slice(0, 5).join(" | "))
    browser.close()
  }
  fs.writeFileSync(join(suite.outDir, "results.json"), JSON.stringify(suite.results, null, 2))
  console.log("")
  reseed()
  const passed = suite.results.filter((r) => r.ok).length
  console.log(`\n${suite.name}: ${passed}/${suite.results.length} checks passed`)
  process.exit(passed === suite.results.length ? 0 : 1)
}
