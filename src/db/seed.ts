// Seeds clearly-labelled test data. Safe to run any number of times:
// users are upserted by email and requests by fixed ids, so nothing duplicates.
//
//   npm run db:seed
//
// Only runs against the-bridge-dev (see ./dev-guard.ts), never production.
//
// Runs with Node's built-in TypeScript support, outside Next.js, so it builds
// its own db client instead of importing the server-only one in ./index.ts.

import { neon } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"

import { chicagoLocalToDate } from "../lib/chicago-time.ts"
import { installRedaction } from "../lib/redact.ts"
import { requireDevDatabase } from "./dev-guard.ts"
import { foodRequests, users, type NewFoodRequest } from "./schema.ts"

// Nothing this script prints (including errors) may show a connection string or password.
installRedaction()

try {
  process.loadEnvFile(".env.local")
} catch {
  // Use variables already in the environment.
}

const { DATABASE_URL, NEON_AUTH_BASE_URL, SEED_TEST_PASSWORD } = process.env
if (!DATABASE_URL || !NEON_AUTH_BASE_URL || !SEED_TEST_PASSWORD) {
  throw new Error("DATABASE_URL, NEON_AUTH_BASE_URL and SEED_TEST_PASSWORD must be set.")
}

await requireDevDatabase(DATABASE_URL)
const db = drizzle(neon(DATABASE_URL))

const TEST_USERS = [
  {
    key: "outreach1",
    email: "test.outreach1@example.com",
    displayName: "Test — Outreach Worker A",
    role: "outreach",
    organizationName: "Test — Northwest Side Outreach",
    verificationStatus: "not_required",
  },
  {
    key: "outreach2",
    email: "test.outreach2@example.com",
    displayName: "Test — Outreach Worker B",
    role: "outreach",
    organizationName: "Test — West Side Street Team",
    verificationStatus: "not_required",
  },
  {
    key: "donor1",
    email: "test.donor1@example.com",
    displayName: "Test — Organization A",
    role: "donor",
    organizationName: "Test — Corner Bakery Co-op",
    verificationStatus: "approved",
  },
  {
    key: "donor2",
    email: "test.donor2@example.com",
    displayName: "Test — Organization B",
    role: "donor",
    organizationName: "Test — Pilsen Community Kitchen",
    verificationStatus: "approved",
  },
  // Waiting for review. Fictional details: example.org is reserved for examples, and no
  // real EIN starts with 00.
  {
    key: "donor3",
    email: "test.donor3@example.com",
    displayName: "Test — Organization C (pending)",
    role: "donor",
    organizationName: "Test — Organization C (pending)",
    verificationStatus: "pending",
    organizationWebsite: "https://example.org/organization-c",
    organizationEin: "00-1234567",
    contactName: "Test — Contact C",
  },
  // Reviews organizations at /admin. Dev only: this seed never runs against production, and
  // the app itself has no way to grant admin.
  {
    key: "admin",
    email: "test.admin@example.com",
    displayName: "Test — Admin",
    role: "outreach",
    organizationName: "Test — The Bridge reviewers",
    verificationStatus: "not_required",
    isAdmin: true,
  },
] as const

type UserKey = (typeof TEST_USERS)[number]["key"]

/** Create the login in Neon Auth if it isn't there yet. */
async function ensureAuthAccount(email: string, name: string) {
  // Check Neon Auth's own user table first, so re-runs don't call the sign-up endpoint
  // (which rate-limits repeated calls).
  const existing = await db.execute(sql`select 1 from neon_auth."user" where email = ${email}`)
  if (existing.rows.length > 0) return "exists"
  const res = await fetch(`${NEON_AUTH_BASE_URL}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ email, name, password: SEED_TEST_PASSWORD }),
  })
  if (res.ok) return "created"
  const body = await res.text()
  if (/already exists|USER_ALREADY_EXISTS/i.test(body)) return "exists"
  throw new Error(`Auth sign-up failed for ${email}: ${res.status} ${body}`)
}

/** "YYYY-MM-DDTHH:mm" in Chicago, `days` from today. */
function chicagoAt(days: number, hhmm: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(
    new Date()
  ) // en-CA gives YYYY-MM-DD
  const d = new Date(`${today}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return chicagoLocalToDate(`${d.toISOString().slice(0, 10)}T${hhmm}`)
}

async function main() {
  const ids = {} as Record<UserKey, string>

  for (const u of TEST_USERS) {
    const auth = await ensureAuthAccount(u.email, u.displayName)
    // Re-running resets each test account, including any review, to these values.
    const fields = {
      displayName: u.displayName,
      role: u.role,
      organizationName: u.organizationName,
      verificationStatus: u.verificationStatus,
      organizationWebsite: "organizationWebsite" in u ? u.organizationWebsite : null,
      organizationEin: "organizationEin" in u ? u.organizationEin : null,
      contactName: "contactName" in u ? u.contactName : null,
      reviewedAt: null,
      reviewedBy: null,
      reviewNote: null,
      isAdmin: "isAdmin" in u ? u.isAdmin : false,
    }
    const [row] = await db
      .insert(users)
      .values({ email: u.email, ...fields })
      .onConflictDoUpdate({ target: users.email, set: fields })
      .returning({ id: users.id })
    ids[u.key] = row.id
    console.log(`user    ${u.email.padEnd(28)} auth:${auth.padEnd(8)} id:${row.id}`)
  }

  // Fixed ids make re-runs update in place instead of inserting duplicates.
  const requests: NewFoodRequest[] = [
    {
      id: "5eed0000-0000-4000-8000-000000000001",
      createdBy: ids.outreach1,
      peopleCount: 25,
      category: "food",
      items: "Hot meals",
      dietaryNotes: "4 vegetarian",
      neighborhood: "Logan Square",
      windowStart: chicagoAt(1, "11:00"),
      windowEnd: chicagoAt(1, "13:00"),
      status: "open",
      claimedBy: null,
    },
    {
      id: "5eed0000-0000-4000-8000-000000000002",
      createdBy: ids.outreach1,
      peopleCount: 40,
      category: "clothing",
      items: "Winter coats, sizes M–XL",
      dietaryNotes: null,
      neighborhood: "Humboldt Park",
      windowStart: chicagoAt(2, "17:00"),
      windowEnd: chicagoAt(2, "19:00"),
      status: "open",
      claimedBy: null,
    },
    {
      id: "5eed0000-0000-4000-8000-000000000003",
      createdBy: ids.outreach2,
      peopleCount: 15,
      category: "hygiene",
      items: "Hygiene kits: soap, toothpaste, deodorant",
      dietaryNotes: "Travel sizes preferred",
      neighborhood: "Lower West Side", // Pilsen
      windowStart: chicagoAt(1, "09:00"),
      windowEnd: chicagoAt(1, "10:30"),
      status: "open",
      claimedBy: null,
    },
    {
      id: "5eed0000-0000-4000-8000-000000000004",
      createdBy: ids.outreach2,
      peopleCount: 60,
      category: "food",
      items: "Hot meals",
      dietaryNotes: "No pork",
      neighborhood: "Near West Side",
      windowStart: chicagoAt(3, "12:00"),
      windowEnd: chicagoAt(3, "14:00"),
      status: "claimed",
      claimedBy: ids.donor1,
    },
    {
      id: "5eed0000-0000-4000-8000-000000000005",
      createdBy: ids.outreach1,
      peopleCount: 30,
      category: "food",
      items: "Breakfast burritos",
      dietaryNotes: null,
      neighborhood: "Logan Square",
      windowStart: chicagoAt(-2, "07:30"),
      windowEnd: chicagoAt(-2, "09:00"),
      status: "delivered",
      claimedBy: ids.donor2,
    },
    {
      id: "5eed0000-0000-4000-8000-000000000006",
      createdBy: ids.outreach2,
      peopleCount: 20,
      category: "other",
      items: "Blankets",
      dietaryNotes: null,
      neighborhood: "Near West Side",
      windowStart: chicagoAt(-1, "18:00"),
      windowEnd: chicagoAt(-1, "19:30"),
      status: "cancelled",
      claimedBy: null,
    },
  ]

  for (const { id, ...rest } of requests) {
    await db.insert(foodRequests).values({ id, ...rest }).onConflictDoUpdate({
      target: foodRequests.id,
      set: rest,
    })
  }

  const [counts] = await db.execute<{ users: number; requests: number }>(sql`
    select
      (select count(*)::int from ${users} where display_name like 'Test —%') as users,
      (select count(*)::int from ${foodRequests} where id::text like '5eed0000-%') as requests
  `).then((r) => r.rows)
  console.log(`seeded  ${counts.users} test users, ${counts.requests} test requests`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
