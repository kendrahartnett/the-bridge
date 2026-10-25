// Checks that script output never shows secrets (src/lib/redact.ts).
//
//   npm run test:redact
//
// Uses only made-up secrets. The end-to-end checks run the real seed and test scripts with a
// fake database password and confirm it never appears in what they print. They can't reach
// any data: the fake password is refused before anything is read or written.

import { spawnSync } from "node:child_process"
import { inspect } from "node:util"

import { addSecret, redact } from "../src/lib/redact.ts"

let failed = 0
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`)
}

// Made up at runtime so no realistic-looking secret sits in this file.
const fakePassword = "npg_" + "FAKEpass" + "123456"
const fakeUrl = `postgresql://neondb_owner:${fakePassword}@ep-fake-endpoint-pooler.example.neon.tech/neondb?sslmode=require`
const fakeKey = "sk-ant-" + "api03-" + "FAKEkeyFAKEkey"
const fakeCookie = "f".repeat(16) + "cookie" + "e".repeat(16)

// ---- Unit checks ----
check("Database URL is replaced", !redact(`connecting to ${fakeUrl}`).includes(fakePassword) && redact(fakeUrl) === "[database URL]", redact(`connecting to ${fakeUrl}`))
check("Quoted URL (the earlier leak) is replaced", !redact(`input: '"${fakeUrl}"'`).includes(fakePassword), redact(`input: '"${fakeUrl}"'`))
check("Neon password on its own is replaced", redact(`password ${fakePassword} rejected`) === "password [password] rejected")
check("Anthropic API key is replaced", redact(`key=${fakeKey}`) === "key=[API key]")
check("Password inside any other URL is replaced", redact("https://user:hunter2hunter2@example.com/x") === "https://user:[password]@example.com/x")
addSecret(fakeCookie)
check("A registered secret (e.g. read from .env.prod.local) is replaced", redact(`secret is ${fakeCookie}.`) === "secret is [redacted].")
const err = Object.assign(new TypeError("Invalid URL"), { input: `"${fakeUrl}"` })
const printed = redact(inspect(err))
check("An error that echoes its input is printed without the secret", !printed.includes(fakePassword) && printed.includes("Invalid URL"), printed.split("\n")[0])
check("Ordinary text is unchanged", redact("Seeded 6 test users at ep-misty-mountain (test.admin@example.com).") === "Seeded 6 test users at ep-misty-mountain (test.admin@example.com).")

// ---- End to end: the real scripts, with a fake password that must never be printed ----
const devHostUrl = `postgresql://neondb_owner:${fakePassword}@ep-misty-mountain-b45ezh8o-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require`
for (const [label, script] of [
  ["Seed", "src/db/seed.ts"],
  ["test:claims", "scripts/test-claim-rules.ts"],
]) {
  const run = spawnSync(process.execPath, ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", script], {
    env: { ...process.env, DATABASE_URL: devHostUrl },
    encoding: "utf8",
  })
  const out = run.stdout + run.stderr
  check(`${label} with a wrong password fails without printing it`, run.status !== 0 && !out.includes(fakePassword) && !out.includes(devHostUrl), out.trim().split("\n").slice(0, 2).join(" | ").slice(0, 160))
}

// A crash whose error message contains the connection string.
const crash = spawnSync(
  process.execPath,
  [
    "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON",
    "--input-type=module",
    "-e",
    `const { installRedaction } = await import(${JSON.stringify(new URL("../src/lib/redact.ts", import.meta.url).href)}); installRedaction(); new URL(${JSON.stringify(`"${fakeUrl}"`)})`,
  ],
  { encoding: "utf8" }
)
const crashOut = crash.stdout + crash.stderr
check("An uncaught crash is printed redacted and exits 1", crash.status === 1 && !crashOut.includes(fakePassword) && crashOut.includes("Invalid URL"), crashOut.trim().split("\n")[0])

console.log(`\n${failed === 0 ? "All checks passed" : `${failed} failed`}`)
process.exit(failed === 0 ? 0 : 1)
