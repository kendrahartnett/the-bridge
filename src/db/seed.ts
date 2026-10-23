// Seeds clearly-labelled test data. Safe to run any number of times:
// users are upserted by email and requests by fixed ids, so nothing duplicates.
//
//   npm run db:seed
//
// Runs with Node's built-in TypeScript support, outside Next.js, so it builds
// its own db client instead of importing the server-only one in ./index.ts.

import { neon } from "@neondatabase/serverless"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"

import { chicagoLocalToDate } from "../lib/chicago-time.ts"
import { foodRequests, users, type NewFoodRequest } from "./schema.ts"

try {
  process.loadEnvFile(".env.local")
} catch {
  // Use variables already in the environment.
}

const { DATABASE_URL, NEON_AUTH_BASE_URL, SEED_TEST_PASSWORD } = process.env
if (!DATABASE_URL || !NEON_AUTH_BASE_URL || !SEED_TEST_PASSWORD) {
  throw new Error("DATABASE_URL, NEON_AUTH_BASE_URL and SEED_TEST_PASSWORD must be set.")
}

const db = drizzle(neon(DATABASE_URL))

const TEST_USERS = [
  {
    key: "outreach1",
    email: "test.outreach1@example.com",
    displayName: "Test — Outreach Worker A",
    role: "outreach",
    organizationName: "Test — Northwest Side Outreach",
  },
  {
    key: "outreach2",
    email: "test.outreach2@example.com",
    displayName: "Test — Outreach Worker B",
    role: "outreach",
    organizationName: "Test — West Side Street Team",
  },
  {
    key: "donor1",
    email: "test.donor1@example.com",
    displayName: "Test — Donor A",
    role: "donor",
    organizationName: "Test — Corner Bakery Co-op",
  },
  {
    key: "donor2",
    email: "test.donor2@example.com",
    displayName: "Test — Donor B",
    role: "donor",
    organizationName: "Test — Pilsen Community Kitchen",
  },
] as const

type UserKey = (typeof TEST_USERS)[number]["key"]

/** Create the login in Neon Auth if it isn't there yet. */
async function ensureAuthAccount(email: string, name: string) {
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
    const [row] = await db
      .insert(users)
      .values({
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        organizationName: u.organizationName,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          displayName: u.displayName,
          role: u.role,
          organizationName: u.organizationName,
        },
      })
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
      foodType: "Hot meals",
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
      foodType: "Sandwiches and water",
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
      foodType: "Fruit and snacks",
      dietaryNotes: "Soft foods if possible",
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
      foodType: "Hot meals",
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
      foodType: "Breakfast burritos",
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
      foodType: "Soup and bread",
      dietaryNotes: null,
      neighborhood: "Near West Side",
      windowStart: chicagoAt(-1, "18:00"),
      windowEnd: chicagoAt(-1, "19:30"),
      status: "cancelled",
      claimedBy: null,
    },
  ]

  for (const r of requests) {
    const { id: _id, ...rest } = r
    await db.insert(foodRequests).values(r).onConflictDoUpdate({
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
