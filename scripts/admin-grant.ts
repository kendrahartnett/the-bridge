// Gives an existing account admin rights (can review organizations at /admin).
//
//   npm run admin:grant -- you@example.com        development (the database in .env.local)
//   npm run admin:grant:prod -- you@example.com   PRODUCTION (.env.prod.local only); asks you
//                                                 to type "yes" before changing anything
//
// These scripts are the only way to grant admin; the app has no way to do it. The account
// must already exist (sign up first). Prints the target project and the email, never the
// connection string.

import { neon } from "@neondatabase/serverless"
import fs from "node:fs"
import { createInterface } from "node:readline/promises"

import { addSecret, installRedaction } from "../src/lib/redact.ts"

// Nothing this script prints (including errors) may show a connection string or password.
installRedaction()

const PROJECTS: Record<string, string> = {
  "sparkling-bird-06840224": "the-bridge (production)",
  "purple-hill-95844872": "the-bridge-dev",
}

const production = process.argv.includes("--production")
const email = process.argv
  .slice(2)
  .find((a) => !a.startsWith("--"))
  ?.trim()
  .toLowerCase()
if (!email || !email.includes("@")) {
  console.error(`Usage: npm run ${production ? "admin:grant:prod" : "admin:grant"} -- <email>`)
  process.exit(1)
}

/** The connection string from one env file, read directly (never from the shell). */
function readDatabaseUrl(file: string) {
  if (!fs.existsSync(file)) {
    console.error(`${file} not found.`)
    process.exit(1)
  }
  const line = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("DATABASE_URL="))
  const url = line?.slice("DATABASE_URL=".length).replace(/^"(.*)"$/, "$1")
  if (!url) {
    console.error(`DATABASE_URL is missing from ${file}.`)
    process.exit(1)
  }
  addSecret(url)
  return url
}

const sql = neon(readDatabaseUrl(production ? ".env.prod.local" : ".env.local"))
const [where] = await sql`select current_setting('neon.project_id', true) as project`
const project = PROJECTS[where?.project] ?? `unknown Neon project ${where?.project ?? ""}`.trim()
console.log(`Target: ${project}`)
console.log(`Account: ${email}`)

if (production) {
  if (where?.project !== "sparkling-bird-06840224") {
    console.error("Refusing: .env.prod.local does not point at the production project.")
    process.exit(1)
  }
  // Requires a typed "yes". No input (for example, run from another script) cancels.
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  // If input closes without an answer, the question never resolves on its own; treat it as "no".
  const answer = await new Promise<string>((resolve) => {
    rl.question(`Type "yes" to make ${email} an admin on PRODUCTION: `).then(resolve, () => resolve(""))
    rl.once("close", () => resolve(""))
  })
  rl.close()
  if (answer.trim() !== "yes") {
    console.error("Cancelled. Nothing was changed.")
    process.exit(1)
  }
}

const updated = await sql`update users set is_admin = true where email = ${email} returning email`
if (updated.length === 0) {
  console.error(`No account found for ${email} in ${project}. Sign up first, then run this again.`)
  process.exit(1)
}
console.log(`${email} is now an admin in ${project}.`)
