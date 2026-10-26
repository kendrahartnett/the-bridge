// Runs every browser test suite in turn against the local server and the-bridge-dev
// database, then prints which passed. Flags (such as --themes=dark) are passed to each suite.
//   npm run e2e

import { spawn, spawnSync } from "node:child_process"

import { acquireLock } from "./lock.ts"

const SUITES = ["responsive", "dashboards", "admin", "contact", "nav", "verification", "form", "dropdown", "panel", "notices", "homepage", "signin", "a11y"]

// One lock for the whole run; the suites started here run under it (E2E_LOCK_OWNER).
acquireLock("npm run e2e")

// Windows pauses every process when the screen turns off (Modern Standby), which freezes a
// run mid-suite. While this run is alive, a helper asks Windows to keep the system and
// display awake (SetThreadExecutionState; no settings change), and exits once the run ends.
if (process.platform === "win32") {
  const keepAwake = `
    $t = Add-Type -Name P -Namespace KeepAwake -PassThru -MemberDefinition '[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint f);'
    [void]$t::SetThreadExecutionState([uint32]"0x80000003")
    while (Get-Process -Id ${process.pid} -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 15 }`
  spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", keepAwake], { stdio: "ignore", detached: true }).unref()
  console.log("Keeping the computer awake until the run ends.")
}

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
