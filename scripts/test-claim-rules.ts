// Request and response rules, run against the dev database.
//
//   npm run test:claims
//
// Calls the same rule functions the server actions call (src/lib/request-rules.ts) with
// real test users from the database. Creates its own fictional requests (tagged
// "[claim-test <run>]"), deletes only those afterwards, and checks the 6 seeded
// requests are unchanged. Writes the results to docs/test-results.md.

import { neon } from "@neondatabase/serverless"
import { and, eq, inArray, like, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import fs from "node:fs"

import * as schema from "../src/db/schema.ts"
import { foodRequests, users } from "../src/db/schema.ts"
import {
  cancelRequest,
  claimRequest,
  confirmDelivery,
  createRequest,
  listMyPosts,
  listMySupported,
  reviewOrganization,
  type Actor,
} from "../src/lib/request-rules.ts"

try {
  process.loadEnvFile(".env.local")
} catch {
  // Use variables already in the environment.
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.")
const db = drizzle(neon(process.env.DATABASE_URL), { schema })

const RUN = new Date().toISOString().replace(/\D/g, "").slice(0, 14)
const TAG = `[claim-test ${RUN}]`
const created: string[] = []
const results: { name: string; pass: boolean; detail: string }[] = []
const raceRows: { run: number; winner: string; loserMessage: string; pass: boolean }[] = []

function record(name: string, pass: boolean, detail = "") {
  results.push({ name, pass, detail })
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`)
}

async function actor(email: string): Promise<Actor & { label: string }> {
  const [u] = await db.select().from(users).where(eq(users.email, email))
  if (!u) throw new Error(`Missing seeded user ${email}. Run npm run db:seed first.`)
  return { id: u.id, role: u.role, label: u.displayName ?? email }
}

async function status(id: string) {
  const [r] = await db
    .select({ status: foodRequests.status, claimedBy: foodRequests.claimedBy })
    .from(foodRequests)
    .where(eq(foodRequests.id, id))
  return r
}

// A fictional open request from `owner`, created through the same rule the form uses.
async function newRequest(owner: Actor, what: string): Promise<string> {
  const day = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  const r = await createRequest(db, owner, {
    peopleCount: "5",
    category: "clothing",
    items: `${TAG} ${what}`,
    dietaryNotes: "",
    neighborhood: "Logan Square",
    windowStart: `${day}T10:00`,
    windowEnd: `${day}T12:00`,
  })
  if (!r.ok) throw new Error(`Could not create test request: ${JSON.stringify(r)}`)
  created.push(r.id)
  return r.id
}

// Test scaffolding only: the app itself never grants admin. The run grants it to one test
// account and removes it again at the end (also after an error).
async function setAdmin(id: string, isAdmin: boolean) {
  await db.update(users).set({ isAdmin }).where(eq(users.id, id))
}

// Put test.donor3 back to its seeded state: pending, never reviewed.
async function resetPendingOrg(id: string) {
  await db
    .update(users)
    .set({ verificationStatus: "pending", reviewedAt: null, reviewedBy: null, reviewNote: null })
    .where(eq(users.id, id))
}

const scaffolding: { adminId?: string; pendingOrgId?: string } = {}

const SEEDED_PREFIX = "5eed0000-"
const OTHER_ORG_MESSAGE = "Someone else just offered support for this request."

async function main() {
  const out1 = await actor("test.outreach1@example.com")
  const out2 = await actor("test.outreach2@example.com")
  const orgA = await actor("test.donor1@example.com")
  const orgB = await actor("test.donor2@example.com")
  const orgC = await actor("test.donor3@example.com") // seeded as pending

  const seededBefore = await db
    .select()
    .from(foodRequests)
    .where(like(sql`${foodRequests.id}::text`, `${SEEDED_PREFIX}%`))
    .orderBy(foodRequests.id)
  const totalBefore = (await db.select({ n: sql<number>`count(*)::int` }).from(foodRequests))[0].n

  // 1. An organization can offer support on an open request; it becomes In Progress.
  const r1 = await newRequest(out1, "offer")
  const offer = await claimRequest(db, orgA, r1)
  const s1 = await status(r1)
  record("Organization offers support on an open request → In Progress", offer.ok && s1.status === "claimed" && s1.claimedBy === orgA.id,
    `result ${offer.ok ? "ok" : (offer as { error: string }).error}; status ${s1.status} (shown as "In Progress")`)

  // 2. A second organization cannot offer support on the same request.
  const second = await claimRequest(db, orgB, r1)
  const s2 = await status(r1)
  record("Second organization cannot offer support on the same request", !second.ok && (second as { error: string }).error === OTHER_ORG_MESSAGE && s2.claimedBy === orgA.id,
    `"${(second as { error?: string }).error}"; still supported by ${orgA.label}`)

  // 3. An outreach user cannot offer support.
  const r3 = await newRequest(out1, "outreach tries to offer")
  const byOutreach = await claimRequest(db, out2, r3)
  const s3 = await status(r3)
  record("Outreach user cannot offer support", !byOutreach.ok && s3.status === "open" && s3.claimedBy === null,
    `"${(byOutreach as { error?: string }).error}"; status stays ${s3.status}`)

  // 4. Only the creator can mark Fulfilled, and only when In Progress.
  const r4 = await newRequest(out1, "fulfil rules")
  const tooEarly = await confirmDelivery(db, out1, r4) // still open
  await claimRequest(db, orgA, r4)
  const byOrg = await confirmDelivery(db, orgA, r4)
  const byOtherOutreach = await confirmDelivery(db, out2, r4)
  const sBefore = await status(r4)
  const byCreator = await confirmDelivery(db, out1, r4)
  const sAfter = await status(r4)
  const again = await confirmDelivery(db, out1, r4)
  record("Fulfil: creator cannot fulfil while Open", !tooEarly.ok, `"${(tooEarly as { error?: string }).error}"`)
  record("Fulfil: an organization cannot fulfil", !byOrg.ok, `"${(byOrg as { error?: string }).error}"`)
  record("Fulfil: a different outreach user cannot fulfil", !byOtherOutreach.ok, `"${(byOtherOutreach as { error?: string }).error}"`)
  record("Fulfil: creator fulfils when In Progress → Fulfilled", sBefore.status === "claimed" && byCreator.ok && sAfter.status === "delivered", `status ${sBefore.status} → ${sAfter.status} (shown as "Fulfilled")`)
  record("Fulfil: cannot fulfil twice", !again.ok, `"${(again as { error?: string }).error}"`)

  // 5. Only the creator can cancel, and only while Open.
  const r5 = await newRequest(out1, "cancel rules")
  const cancelByOrg = await cancelRequest(db, orgA, r5)
  const cancelOk = await cancelRequest(db, out1, r5)
  const s5 = await status(r5)
  const r5b = await newRequest(out1, "cancel after support")
  await claimRequest(db, orgA, r5b)
  const cancelInProgress = await cancelRequest(db, out1, r5b)
  const s5b = await status(r5b)
  record("Cancel: an organization cannot cancel", !cancelByOrg.ok, `"${(cancelByOrg as { error?: string }).error}"`)
  record("Cancel: creator cancels while Open → Cancelled", cancelOk.ok && s5.status === "cancelled", `status ${s5.status}`)
  record("Cancel: creator cannot cancel once In Progress", !cancelInProgress.ok && s5b.status === "claimed", `"${(cancelInProgress as { error?: string }).error}"; status stays ${s5b.status}`)

  // 6. A different outreach user cannot fulfil or cancel someone else's request.
  const r6open = await newRequest(out1, "other outreach cancel")
  const r6claimed = await newRequest(out1, "other outreach fulfil")
  await claimRequest(db, orgA, r6claimed)
  const otherCancel = await cancelRequest(db, out2, r6open)
  const otherFulfil = await confirmDelivery(db, out2, r6claimed)
  const s6a = await status(r6open), s6b = await status(r6claimed)
  record("Different outreach user cannot cancel someone else's request", !otherCancel.ok && s6a.status === "open", `"${(otherCancel as { error?: string }).error}"`)
  record("Different outreach user cannot fulfil someone else's request", !otherFulfil.ok && s6b.status === "claimed", `"${(otherFulfil as { error?: string }).error}"`)

  // 7. Create-request rule with an invalid category is rejected and creates no row.
  const countBefore = (await db.select({ n: sql<number>`count(*)::int` }).from(foodRequests))[0].n
  const day = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  const bad = await createRequest(db, out1, {
    peopleCount: "5", category: "weapons", items: `${TAG} invalid category`, dietaryNotes: "",
    neighborhood: "Logan Square", windowStart: `${day}T10:00`, windowEnd: `${day}T12:00`,
  })
  const countAfter = (await db.select({ n: sql<number>`count(*)::int` }).from(foodRequests))[0].n
  const badRows = await db.select({ id: foodRequests.id }).from(foodRequests).where(eq(foodRequests.items, `${TAG} invalid category`))
  record(`Invalid category "weapons" is rejected and no row is created`, !bad.ok && !!bad.fieldErrors?.category && countAfter === countBefore && badRows.length === 0,
    `category error "${bad.ok ? "" : bad.fieldErrors?.category?.[0]}"; rows ${countBefore} → ${countAfter}`)

  // 8. Organization verification.
  scaffolding.pendingOrgId = orgC.id
  scaffolding.adminId = out2.id
  await resetPendingOrg(orgC.id)
  const err = (r: { ok: boolean }) => (r as { error?: string }).error ?? ""
  const postAs = async (who: Actor, what: string) => {
    const r = await createRequest(db, who, {
      peopleCount: "5", category: "clothing", items: `${TAG} ${what}`, dietaryNotes: "",
      neighborhood: "Logan Square", windowStart: `${day}T10:00`, windowEnd: `${day}T12:00`,
    })
    if (r.ok) created.push(r.id)
    return r
  }

  // 8a. Pending: cannot claim or post.
  const r8 = await newRequest(out1, "verification target")
  const pendingClaim = await claimRequest(db, orgC, r8)
  const pendingPost = await postAs(orgC, "pending org posts")
  record("Pending organization cannot claim a need", !pendingClaim.ok && (await status(r8)).status === "open", `"${err(pendingClaim)}"`)
  record("Pending organization cannot post a need", !pendingPost.ok, `"${err(pendingPost)}"`)

  // 8b. Reviews: a non-admin can't approve or reject; an admin can.
  const reviewByOrg = await reviewOrganization(db, orgA, { organizationId: orgC.id, decision: "approved" })
  const reviewByOutreach = await reviewOrganization(db, out1, { organizationId: orgC.id, decision: "rejected" })
  const [stillPending] = await db.select({ v: users.verificationStatus }).from(users).where(eq(users.id, orgC.id))
  record("Non-admin (organization) cannot approve", !reviewByOrg.ok && stillPending.v === "pending", `"${err(reviewByOrg)}"`)
  record("Non-admin (outreach) cannot reject", !reviewByOutreach.ok && stillPending.v === "pending", `"${err(reviewByOutreach)}"; status stays ${stillPending.v}`)
  await setAdmin(out2.id, true)
  const longNote = await reviewOrganization(db, out2, { organizationId: orgC.id, decision: "rejected", note: "x".repeat(301) })
  record("Review note over 300 characters is refused", !longNote.ok, `"${err(longNote)}"`)
  const reject = await reviewOrganization(db, out2, { organizationId: orgC.id, decision: "rejected", note: `${TAG} website didn't match` })
  const [rej] = await db.select().from(users).where(eq(users.id, orgC.id))
  record("Admin can reject; reviewer, time, and note are recorded", reject.ok && rej.verificationStatus === "rejected" && rej.reviewedBy === out2.id && !!rej.reviewedAt && rej.reviewNote === `${TAG} website didn't match`,
    `status ${rej.verificationStatus}; reviewed by ${rej.reviewedBy === out2.id ? "the admin" : rej.reviewedBy}; note saved`)

  // 8c. Rejected: cannot claim or post.
  const rejectedClaim = await claimRequest(db, orgC, r8)
  const rejectedPost = await postAs(orgC, "rejected org posts")
  record("Rejected organization cannot claim a need", !rejectedClaim.ok && (await status(r8)).status === "open", `"${err(rejectedClaim)}"`)
  record("Rejected organization cannot post a need", !rejectedPost.ok, `"${err(rejectedPost)}"`)

  // 8d. Approved: can claim and can post; can't claim its own post.
  const approve = await reviewOrganization(db, out2, { organizationId: orgC.id, decision: "approved" })
  const [appr] = await db.select().from(users).where(eq(users.id, orgC.id))
  record("Admin can approve", approve.ok && appr.verificationStatus === "approved" && appr.reviewNote === null, `status ${appr.verificationStatus}`)
  const approvedClaim = await claimRequest(db, orgC, r8)
  const s8 = await status(r8)
  record("Approved organization can claim a need", approvedClaim.ok && s8.status === "claimed" && s8.claimedBy === orgC.id, `status ${s8.status}`)
  const approvedPost = await postAs(orgC, "approved org posts")
  record("Approved organization can post a need", approvedPost.ok, approvedPost.ok ? "created" : `"${err(approvedPost)}"`)
  if (approvedPost.ok) {
    const own = await claimRequest(db, orgC, approvedPost.id)
    const sOwn = await status(approvedPost.id)
    record("Organization cannot claim its own post", !own.ok && sOwn.status === "open", `"${err(own)}"; status stays ${sOwn.status}`)
  }

  // 8e. Contact visibility follows approval: revoking it hides the poster's email on the
  // organization's existing claims.
  const before = (await listMySupported(db, orgC.id)).find((r) => r.id === r8)
  const revoke = await reviewOrganization(db, out2, { organizationId: orgC.id, decision: "rejected" })
  const after = (await listMySupported(db, orgC.id)).find((r) => r.id === r8)
  record("Approved organization sees the poster's email on its claim", before?.contact?.email === "test.outreach1@example.com", `email ${before?.contact?.email ? "shown" : "hidden"}`)
  record("After approval is revoked, the poster's email is hidden on its existing claims", revoke.ok && !!after && after.contact?.email === null,
    `claim still listed: ${!!after}; email ${after?.contact?.email === null ? "hidden (null from the query)" : "STILL SHOWN"}`)
  const posterView = (await listMyPosts(db, out1.id)).find((r) => r.id === r8)
  record("Poster still sees who supports the need after a revocation", posterView?.contact?.name === "Test — Organization C (pending)", `"${posterView?.contact?.name}"`)
  await setAdmin(out2.id, false)
  await resetPendingOrg(orgC.id)

  // 9. Race: two organizations offer at the same moment, 10 times. Exactly one wins.
  for (let run = 1; run <= 10; run++) {
    const rid = await newRequest(out1, `race ${run}`)
    const [a, b] = await Promise.all([claimRequest(db, orgA, rid), claimRequest(db, orgB, rid)])
    const s = await status(rid)
    const winners = [a, b].filter((r) => r.ok).length
    const loser = a.ok ? b : a
    const winnerActor = a.ok ? orgA : orgB
    const pass = winners === 1 && !loser.ok && loser.error === OTHER_ORG_MESSAGE && s.status === "claimed" && s.claimedBy === winnerActor.id
    raceRows.push({ run, winner: winners === 1 ? winnerActor.label : `${winners} winners`, loserMessage: loser.ok ? "(both succeeded)" : loser.error, pass })
  }
  const racePass = raceRows.every((r) => r.pass)
  record("Race: exactly one of two simultaneous offers succeeds (10 runs)", racePass, `${raceRows.filter((r) => r.pass).length}/10 runs correct`)
  for (const r of raceRows) console.log(`      run ${String(r.run).padStart(2)}: winner ${r.winner}; other got "${r.loserMessage}" ${r.pass ? "✓" : "✗"}`)

  // 10. The database itself rejects invalid status / claimed_by combinations.
  const r9 = await newRequest(out1, "db constraint")
  const dbChecks: [string, () => Promise<unknown>][] = [
    ["status 'claimed' with no claimed_by", () => db.update(foodRequests).set({ status: "claimed" }).where(eq(foodRequests.id, r9))],
    ["status 'open' with a claimed_by", () => db.update(foodRequests).set({ claimedBy: orgA.id }).where(eq(foodRequests.id, r9))],
    ["status 'delivered' with no claimed_by", () => db.update(foodRequests).set({ status: "delivered" }).where(eq(foodRequests.id, r9))],
  ]
  for (const [label, attempt] of dbChecks) {
    let message = ""
    try { await attempt() } catch (e) { message = String((e as { cause?: { message?: string } }).cause?.message ?? (e as Error).message) }
    const s = await status(r9)
    record(`Database rejects ${label}`, message.includes("claim_status_consistency") && s.status === "open" && s.claimedBy === null, message ? `"${message.slice(0, 90)}"` : "was NOT rejected")
  }

  // ---- Cleanup: delete only this run's rows, then prove the seeded rows are unchanged ----
  const deleted = await db
    .delete(foodRequests)
    .where(and(inArray(foodRequests.id, created), like(foodRequests.items, `${TAG}%`)))
    .returning({ id: foodRequests.id })
  const seededAfter = await db
    .select()
    .from(foodRequests)
    .where(like(sql`${foodRequests.id}::text`, `${SEEDED_PREFIX}%`))
    .orderBy(foodRequests.id)
  const totalAfter = (await db.select({ n: sql<number>`count(*)::int` }).from(foodRequests))[0].n
  const unchanged = JSON.stringify(seededAfter) === JSON.stringify(seededBefore)
  record(`Cleanup: deleted only this run's ${created.length} test requests; seeded requests unchanged`,
    deleted.length === created.length && unchanged && totalAfter === totalBefore,
    `deleted ${deleted.length}/${created.length}; seeded rows identical: ${unchanged}; total rows ${totalBefore} → ${totalAfter}`)

  writeReport({ out1, out2, orgA, orgB, orgC })
}

function writeReport(who: Record<string, { label: string }>) {
  const passed = results.filter((r) => r.pass).length
  const lines = [
    "# Test results: request and response rules",
    "",
    `Run: ${new Date().toLocaleString("en-US", { timeZone: "America/Chicago" })} (Chicago time) · tag \`${TAG}\``,
    "",
    "Command: `npm run test:claims` (scripts/test-claim-rules.ts), against the dev database.",
    "The script calls the same rule functions the server actions call (src/lib/request-rules.ts)",
    "with real test users, creates its own fictional requests, and deletes only those afterwards.",
    "",
    `Users: outreach ${who.out1.label}, ${who.out2.label}; organizations ${who.orgA.label}, ${who.orgB.label}, ${who.orgC.label}.`,
    "For the verification checks, the run gives test.outreach2 admin rights directly in the database",
    "and removes them afterwards (the app has no way to grant admin), and resets test.donor3 to pending.",
    "",
    `**${passed}/${results.length} checks passed.**`,
    "",
    "| # | Check | Result | Detail |",
    "|---|---|---|---|",
    ...results.map((r, i) => `| ${i + 1} | ${r.name} | ${r.pass ? "PASS" : "**FAIL**"} | ${r.detail.replace(/\|/g, "\\|")} |`),
    "",
    "## Race test (10 runs)",
    "",
    "Two organizations offer support on the same open request at the same moment (`Promise.all`).",
    "",
    "| Run | Winner | Other organization got | Result |",
    "|---|---|---|---|",
    ...raceRows.map((r) => `| ${r.run} | ${r.winner} | ${r.loserMessage} | ${r.pass ? "PASS" : "**FAIL**"} |`),
    "",
  ]
  fs.mkdirSync("docs", { recursive: true })
  fs.writeFileSync("docs/test-results.md", lines.join("\n"))
  console.log(`\n${passed}/${results.length} checks passed — written to docs/test-results.md`)
  if (passed !== results.length) process.exitCode = 1
}

main().catch(async (err) => {
  console.error(err)
  if (scaffolding.adminId) await setAdmin(scaffolding.adminId, false)
  if (scaffolding.pendingOrgId) await resetPendingOrg(scaffolding.pendingOrgId)
  // Best-effort cleanup of this run's rows if something threw part-way.
  if (created.length) {
    await db.delete(foodRequests).where(and(inArray(foodRequests.id, created), like(foodRequests.items, `${TAG}%`)))
    console.error(`Cleaned up ${created.length} test requests after the error.`)
  }
  process.exit(1)
})
