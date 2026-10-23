import "server-only"

import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

// Server-only: importing this from a Client Component fails the build,
// so the connection string can never be bundled for the browser.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.")
}

export const db = drizzle(neon(process.env.DATABASE_URL), { schema })
