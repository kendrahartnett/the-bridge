// The production migration script's summary, tested on the-bridge-dev (never production).
//
//   npm run test:migrate-summary
//
// 1. The wording, for 0, 1 and 2 applied migrations and for a failed run.
// 2. A real run through migrateWithSummary against the-bridge-dev, which is already up to
//    date: it must say so, give the total, and print no connection string, host or password.
// 3. scripts/migrate-production.ts still refuses to start without --confirm.

import { spawnSync } from "node:child_process"

import { requireDevDatabase } from "../src/db/dev-guard.ts"
import { addSecret, installRedaction } from "../src/lib/redact.ts"
import { migrateWithSummary, readJournal, recordedMigrations, summarize } from "./migrate-summary.ts"

installRedaction()
try {
  process.loadEnvFile(".env.local")
} catch {
  // Use variables already in the environment.
}
const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set.")
await requireDevDatabase(url)
addSecret(url)

let failures = 0
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`)
}

// 1. Wording.
const journal = readJournal()
const all = journal.map((e) => e.when)
const n = all.length
const last2 = journal.slice(-2).map((e) => e.tag).join(", ")
let lines = summarize(all, all, journal)
check("Nothing pending", lines[0] === `Applied 0 migrations; ${n} already recorded.` && lines[1] === `${n} migrations recorded in total.` && lines.length === 2, lines.join(" / "))
lines = summarize(all.slice(0, -2), all, journal)
check("Two applied, named", lines[0] === `Applied 2 migrations: ${last2}.` && lines[1] === `${n} migrations recorded in total.`, lines.join(" / "))
lines = summarize(all.slice(0, -1), all, journal)
check("One applied (singular)", lines[0] === `Applied 1 migration: ${journal.at(-1)!.tag}.`, lines[0])
lines = summarize(all.slice(0, -2), all.slice(0, -1), journal, true)
check("A failed run says so, lists what got applied and what isn't recorded", lines[0] === `Migration failed. Applied 1 migration before it stopped: ${journal.at(-2)!.tag}.` && lines[1] === `${n - 1} migrations recorded in total.` && lines[2] === `Not recorded yet: ${journal.at(-1)!.tag}.`, lines.join(" / "))

// 2. A real run against the-bridge-dev.
const before = await recordedMigrations(url)
const printed: string[] = []
const run = await migrateWithSummary(url, (line) => printed.push(line))
const pending = n - before.length
check(`Dev run exits 0`, run.status === 0, `exit ${run.status}`)
check(
  `Dev run ends with the summary (${pending} pending before)`,
  printed.includes(pending === 0 ? `Applied 0 migrations; ${n} already recorded.` : `Applied ${pending} migration${pending === 1 ? "" : "s"}: ${journal.slice(-pending).map((e) => e.tag).join(", ")}.`) &&
    printed.at(-1) === `${n} migrations recorded in total.`,
  printed.slice(-2).join(" / ")
)
const { hostname, password } = new URL(url)
const leaks = printed.filter((l) => l.includes(url) || l.includes(hostname) || (password && l.includes(password)) || /postgres(ql)?:\/\//.test(l))
check("Dev run prints no connection string, host or password", leaks.length === 0, `${printed.length} lines printed, ${leaks.length} with connection details`)

// 3. --confirm is still required (exits before reading .env.prod.local or connecting).
const noConfirm = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "scripts/migrate-production.ts"], { encoding: "utf8" })
check("Production script refuses to run without --confirm", noConfirm.status === 1 && noConfirm.stderr.includes("--confirm") && !noConfirm.stdout.includes("Applying"), `exit ${noConfirm.status}`)

console.log(`\n${failures === 0 ? "All checks passed" : `${failures} check(s) failed`}`)
process.exit(failures === 0 ? 0 : 1)
