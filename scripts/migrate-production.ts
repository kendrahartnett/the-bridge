// Applies pending migrations to the PRODUCTION database.
//
//   npm run db:migrate:prod -- --confirm
//
// Everyday work (npm run db:migrate, db:seed, test:claims) uses .env.local, which points at
// the-bridge-dev. Production's connection string lives only in .env.production.local (never
// committed) and in Vercel; this script is the one place that reads it, and only with
// --confirm. Run it after the same migration has been applied and tested on dev.

import { spawnSync } from "node:child_process"
import fs from "node:fs"

if (!process.argv.includes("--confirm")) {
  console.error("This applies migrations to PRODUCTION. Run it again with --confirm:")
  console.error("  npm run db:migrate:prod -- --confirm")
  process.exit(1)
}

const file = ".env.production.local"
if (!fs.existsSync(file)) {
  console.error(`${file} not found. It holds production's DATABASE_URL and is never committed.`)
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

console.log(`Applying migrations to production (${new URL(url).hostname})…`)
// drizzle.config.ts loads .env.local, but a variable that's already set wins, so drizzle-kit
// uses production's URL here.
const result = spawnSync("npx", ["drizzle-kit", "migrate"], {
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
  shell: process.platform === "win32",
})
process.exit(result.status ?? 1)
