// Only one e2e suite or run at a time: they share the test accounts, the dev data they
// reseed, and the local server. A second one exits right away instead of waiting.
//
// The lock is a file holding the owner's process id. `npm run e2e` takes it once and passes
// its id to the suites it starts (E2E_LOCK_OWNER), so they run under it. A lock whose
// process has died (a run that was killed) is stale and is taken over.

import fs from "node:fs"
import { dirname, join } from "node:path"

const LOCK = join("test-results", "e2e", ".lock")

type Holder = { pid: number; what: string; started: string }

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    // EPERM: the process exists but belongs to someone else.
    return (e as NodeJS.ErrnoException).code === "EPERM"
  }
}

const read = (): Holder | null => {
  try {
    return JSON.parse(fs.readFileSync(LOCK, "utf8")) as Holder
  } catch {
    return null
  }
}

/** Takes the lock for this process, or exits at once if another live run holds it. */
export function acquireLock(what: string) {
  const owner = Number(process.env.E2E_LOCK_OWNER)
  const current = read()
  if (owner && current?.pid === owner && alive(owner)) return // running under `npm run e2e`

  fs.mkdirSync(dirname(LOCK), { recursive: true })
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, what, started: new Date().toISOString() }), { flag: "wx" })
      process.on("exit", () => {
        if (read()?.pid === process.pid) fs.rmSync(LOCK, { force: true })
      })
      return
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e
      const holder = read()
      if (holder && alive(holder.pid)) {
        console.error(
          `Another e2e run is active (${holder.what}, process ${holder.pid}, started ${new Date(holder.started).toLocaleTimeString()}).\n` +
            "Only one can run at a time. Wait for it to finish, or stop it, then try again."
        )
        process.exit(1)
      }
      fs.rmSync(LOCK, { force: true }) // stale: its process is gone
    }
  }
  console.error("Couldn't take the e2e lock. Try again.")
  process.exit(1)
}
