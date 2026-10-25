// Runs every browser test suite in turn against the local server and the-bridge-dev
// database, then prints which passed. Flags (such as --themes=dark) are passed to each suite.
//   npm run e2e

import { spawnSync } from "node:child_process"

import { acquireLock } from "./lock.ts"

const SUITES = ["responsive", "dashboards", "admin", "contact", "nav", "verification", "form", "dropdown", "panel", "notices"]

// One lock for the whole run; the suites started here run under it (E2E_LOCK_OWNER).
acquireLock("npm run e2e")

const time = () => new Date().toLocaleTimeString()
const started = Date.now()
const outcome: [string, boolean, number][] = []
for (const [i, name] of SUITES.entries()) {
  console.log(`\n=== [${i + 1}/${SUITES.length}] ${name} · started ${time()}`)
  const t0 = Date.now()
  const r = spawnSync(
    process.execPath,
    ["--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", `scripts/e2e/${name}.mjs`, ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, E2E_LOCK_OWNER: String(process.pid) } }
  )
  const secs = Math.round((Date.now() - t0) / 1000)
  outcome.push([name, r.status === 0, secs])
  console.log(`=== [${i + 1}/${SUITES.length}] ${name} · ${r.status === 0 ? "passed" : "FAILED"} in ${secs}s`)
}

console.log(`\n=== Summary (${Math.round((Date.now() - started) / 60000)} min)`)
for (const [name, ok, secs] of outcome) console.log(`${ok ? "PASS" : "FAIL"}  ${name} (${secs}s)`)
process.exit(outcome.every(([, ok]) => ok) ? 0 : 1)
