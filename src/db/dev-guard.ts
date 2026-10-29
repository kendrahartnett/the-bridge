// Seed and test scripts write and delete data, so they only ever run against the
// the-bridge-dev branch, never production. Call requireDevDatabase() before
// anything else touches the database.

import { neon } from "@neondatabase/serverless"

/** The-bridge-dev branch of the-bridge, with its dedicated database endpoint. */
const DEV_PROJECT_ID = "sparkling-bird-06840224"
const DEV_BRANCH_ID = "br-tiny-poetry-b4rhh7wl"
const DEV_ENDPOINT = "ep-soft-heart-b4tui7gu"
const PRODUCTION_ENDPOINT = "ep-holy-block-b4xktbl8"

/** A name for where a connection points, without printing the host or anything else from it. */
const describe = (host: string) =>
  host.startsWith(PRODUCTION_ENDPOINT) ? "the-bridge (production)" : "a database that isn't the-bridge-dev"

function refuse(reason: string): never {
  console.error(`Refusing to run: ${reason}`)
  console.error("Seed and test scripts only run against the-bridge-dev. Point DATABASE_URL in .env.local at it.")
  process.exit(1)
}

/**
 * Exits unless DATABASE_URL is the-bridge-dev. Checks the host first (before connecting at
 * all), then asks the database which Neon project it belongs to. Prints only project names,
 * never the URL or host.
 */
export async function requireDevDatabase(url = process.env.DATABASE_URL): Promise<string> {
  if (!url) refuse("DATABASE_URL is not set.")
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    refuse("DATABASE_URL isn't a valid connection string.")
  }
  if (!host.startsWith(`${DEV_ENDPOINT}.`) && !host.startsWith(`${DEV_ENDPOINT}-pooler.`)) {
    refuse(`DATABASE_URL points to ${describe(host)}.`)
  }
  const [row] = await neon(url)`select current_setting('neon.project_id', true) as project, current_setting('neon.branch_id', true) as branch`
  if (row?.project !== DEV_PROJECT_ID || row?.branch !== DEV_BRANCH_ID) {
    refuse("the database did not confirm the-bridge-dev branch.")
  }
  console.log("Database: the-bridge-dev")
  return url
}
