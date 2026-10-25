// Gives an existing account admin rights (can review organizations at /admin).
//
//   npm run admin:grant -- you@example.com
//
// This script is the only way to grant admin; the app has no way to do it. The account must
// already exist (sign up first). Prints the email and result only.

import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"

import { users } from "../src/db/schema.ts"

try {
  process.loadEnvFile(".env.local")
} catch {
  // Use variables already in the environment.
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.")

const email = process.argv[2]?.trim().toLowerCase()
if (!email || !email.includes("@")) {
  console.error("Usage: npm run admin:grant -- <email>")
  process.exit(1)
}

const db = drizzle(neon(process.env.DATABASE_URL))
const updated = await db
  .update(users)
  .set({ isAdmin: true })
  .where(eq(users.email, email))
  .returning({ email: users.email })

if (updated.length === 0) {
  console.error(`No account found for ${email}. Sign up first, then run this again.`)
  process.exit(1)
}
console.log(`${email} is now an admin.`)
