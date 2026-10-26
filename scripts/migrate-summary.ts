// Runs drizzle-kit's migrations against one database and says plainly what happened: which
// migrations were applied this time and how many are recorded in total. Used by
// scripts/migrate-production.ts, and tested against the-bridge-dev by
// scripts/test-migrate-summary.ts.
//
// The connection string is only ever passed to drizzle-kit and the database driver, never
// printed: callers install the redaction filter (src/lib/redact.ts) and register the URL.

import { neon } from "@neondatabase/serverless"
import { spawnSync } from "node:child_process"
import fs from "node:fs"

type JournalEntry = { idx: number; when: number; tag: string }

/** The migrations in drizzle/, in order (drizzle/meta/_journal.json). */
export function readJournal(): JournalEntry[] {
  return JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8")).entries
}

/**
 * The migrations recorded in the database, as their journal timestamps (drizzle-kit stores
 * each migration's `when` in created_at). None if the table doesn't exist yet.
 */
export async function recordedMigrations(url: string): Promise<number[]> {
  const sql = neon(url)
  const [t] = await sql`select to_regclass('drizzle.__drizzle_migrations') is not null as exists`
  if (!t.exists) return []
  const rows = await sql`select created_at from drizzle.__drizzle_migrations order by id`
  return rows.map((r) => Number(r.created_at))
}

/** "0005_request_status_times" for a recorded timestamp, or a placeholder if unknown. */
const tagFor = (journal: JournalEntry[], when: number) =>
  journal.find((e) => e.when === when)?.tag ?? `an unknown migration (${when})`

/**
 * The summary lines, e.g.
 *   Applied 0 migrations; 7 already recorded.
 *   Applied 2 migrations: 0005_request_status_times, 0006_notifications.
 *   7 migrations recorded in total.
 * With `failed`, the first line says so, and still lists what got applied before it stopped.
 */
export function summarize(before: number[], after: number[], journal: JournalEntry[], failed = false): string[] {
  const applied = after.filter((w) => !before.includes(w))
  const plural = (n: number) => `${n} migration${n === 1 ? "" : "s"}`
  const names = applied.map((w) => tagFor(journal, w)).join(", ")
  const first = failed
    ? `Migration failed. Applied ${plural(applied.length)} before it stopped${applied.length ? `: ${names}` : ""}.`
    : applied.length === 0
      ? `Applied 0 migrations; ${before.length} already recorded.`
      : `Applied ${plural(applied.length)}: ${names}.`
  const pending = journal.filter((e) => !after.includes(e.when)).map((e) => e.tag)
  return [
    first,
    `${plural(after.length)} recorded in total.`,
    ...(pending.length ? [`Not recorded yet: ${pending.join(", ")}.`] : []),
  ]
}

/**
 * Applies pending migrations to the database at `url` with drizzle-kit, then prints the
 * summary. drizzle-kit's own output is captured and passed through `print` (the caller's
 * redacting console). Returns the exit status and the summary lines.
 */
export async function migrateWithSummary(url: string, print: (line: string) => void = console.log) {
  const journal = readJournal()
  const before = await recordedMigrations(url)
  // drizzle.config.ts loads .env.local, but a variable that's already set wins, so
  // drizzle-kit uses this URL.
  // One command string (no argument list): with a shell, Node warns about unescaped args.
  const result = spawnSync("npx drizzle-kit migrate", {
    env: { ...process.env, DATABASE_URL: url },
    stdio: ["inherit", "pipe", "pipe"],
    encoding: "utf8",
    shell: true,
  })
  // drizzle-kit draws a spinner with control characters; keep only the readable lines.
  const readable = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/\[.\] applying migrations\.\.\./g, "\n")
    .split(/\r?\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean)
  for (const line of [...new Set(readable)]) print(line)
  const after = await recordedMigrations(url)
  const status = result.status ?? 1
  const summary = summarize(before, after, journal, status !== 0)
  for (const line of summary) print(line)
  return { status, summary, before, after }
}
