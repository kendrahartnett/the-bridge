import { defineConfig } from "drizzle-kit"

// Node 20.12+ built-in .env loader; keeps the connection string out of source.
try {
  process.loadEnvFile(".env.local")
} catch {
  // Fall back to variables already in the environment (CI, hosting).
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local.")
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  strict: true,
  verbose: true,
})
