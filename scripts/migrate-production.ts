// Applies pending migrations to the PRODUCTION database.
//
//   npm run db:migrate:prod -- --confirm
//
// Everyday work (npm run db:migrate, db:seed, test:claims) uses .env.local, which points at
// the-bridge-dev. Production's connection string lives only in .env.prod.local (never
// committed) and in Vercel; this script is the one place that reads it, and only with
// --confirm. Run it after the same migration has been applied and tested on dev.
//
// It always ends with a summary: which migrations it applied (or that none were pending),
// and how many are recorded in total (see scripts/migrate-summary.ts).

import fs from "node:fs"

import { addSecret, installRedaction } from "../src/lib/redact.ts"
import { migrateWithSummary } from "./migrate-summary.ts"

// Nothing this script prints (including drizzle-kit's output and errors) may show a
// connection string or password.
installRedaction()

if (!process.argv.includes("--confirm")) {
  console.error("This applies migrations to PRODUCTION. Run it again with --confirm:")
  console.error("  npm run db:migrate:prod -- --confirm")
  process.exit(1)
}

const file = ".env.prod.local"
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

addSecret(url)
console.log("Applying migrations to production (the-bridge)…")
const { status } = await migrateWithSummary(url)
process.exit(status)
