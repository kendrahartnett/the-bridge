// Privacy screening and moderation rule checks; synthetic text and the development DB only.
import { neon } from "@neondatabase/serverless"
import { eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/neon-http"
import assert from "node:assert/strict"

import * as schema from "../src/db/schema.ts"
import { foodRequests, notifications, privacyReviews, users } from "../src/db/schema.ts"
import { requireDevDatabase } from "../src/db/dev-guard.ts"
import { decidePrivacyReview, getRevisionDraft, listMyPrivacyReviews, listPrivacyReviews } from "../src/lib/privacy-review-rules.ts"
import {
  deterministicCategories, evaluateScreening, parseClassification,
  type PrivacyClassification, type ScreeningDecision,
} from "../src/lib/privacy-screening-core.ts"
import { createRequest, listBoard, type Actor } from "../src/lib/request-rules.ts"
import { installRedaction } from "../src/lib/redact.ts"

installRedaction()
try { process.loadEnvFile(".env.local") } catch { /* CI may supply variables. */ }
await requireDevDatabase()
const db = drizzle(neon(process.env.DATABASE_URL!), { schema })
const createdRequests: string[] = []
const createdReviews: string[] = []
const testRecipients = new Set<string>()
const beforeNotifications = new Set((await db.select({ id: notifications.id }).from(notifications)).map((r) => r.id))
let passed = 0
function check(name: string, condition: unknown) {
  assert.ok(condition, name)
  passed++
  console.log(`PASS ${name}`)
}
const low: PrivacyClassification = { approved: true, riskLevel: "low", categories: [], reason: "No concern.", suggestedRewrite: null }
const screenSafe = async (): Promise<ScreeningDecision> => ({ kind: "safe", categories: [] })
const screenBlocked = async (): Promise<ScreeningDecision> => ({ kind: "blocked", categories: ["exact_address"] })
const screenUnavailable = async (): Promise<ScreeningDecision> => ({ kind: "unavailable", code: "timeout" })

async function run() {
  const examples = [
    ["street address", "Bring supplies to 1234 N Example Street.", "exact_address"],
    ["building number", "They are behind building 1580.", "exact_address"],
    ["apartment", "Apartment 4B", "unit_identifier"],
    ["room", "Room 312", "unit_identifier"],
    ["floor", "Third floor, room 312", "unit_identifier"],
    ["coordinates", "41.8781, -87.6298", "precise_location"],
    ["map pin", "https://maps.google.com/?q=41.8781,-87.6298", "precise_location"],
  ] as const
  for (const [name, content, category] of examples) {
    check(name, deterministicCategories(content).includes(category))
  }
  for (const [name, content] of [
    ["ordinary quantity", "20 blankets for outreach"],
    ["general neighborhood", "Winter coats in Humboldt Park"],
    ["general crossroads", "Near North Avenue and Western Avenue"],
    ["general underpass", "People gathering near an underpass need supplies"],
  ]) check(name, deterministicCategories(content).length === 0)

  check("contradictory AI response rejected", parseClassification({ ...low, approved: true, riskLevel: "high", categories: ["exact_address"] }) === null)
  check("unknown category rejected", parseClassification({ ...low, categories: ["invented"] }) === null)
  check("missing field rejected", parseClassification({ approved: true, riskLevel: "low", categories: [] }) === null)
  const safeLogs: string[] = []
  const clean = await evaluateScreening({ items: "20 blankets for outreach", dietaryNotes: null, neighborhood: "Logan Square" }, async () => low, (result, code) => safeLogs.push(`${result}:${code ?? ""}`))
  check("clean need is not flagged", clean.kind === "safe" && safeLogs.join() === "none:")
  const sensitive = "Synthetic secret marker 1234 N Example Street"
  const logs: string[] = []
  const flagged = await evaluateScreening({ items: sensitive, dietaryNotes: null, neighborhood: "Logan Square" }, async () => low, (result, code) => logs.push(`${result}:${code ?? ""}`))
  check("deterministic flag cannot be overridden by AI", flagged.kind === "blocked")
  check("logs contain no need text", !logs.join().includes(sensitive) && logs.join() === "flagged:")
  const failureLogs: string[] = []
  const unavailable = await evaluateScreening({ items: "Food supplies", dietaryNotes: null, neighborhood: "Logan Square" }, async () => ({ kind: "unavailable", code: "rate_limit" }), (result, code) => failureLogs.push(`${result}:${code ?? ""}`))
  check("API failure returns code only", unavailable.kind === "unavailable" && failureLogs.join() === "none:rate_limit")
  for (const code of ["missing_key", "timeout", "api_error", "invalid_response"] as const) {
    const failureOnly: string[] = []
    const result = await evaluateScreening({ items: "Synthetic coats for outreach", dietaryNotes: null, neighborhood: "Logan Square" },
      async () => ({ kind: "unavailable", code }), (category, errorCode) => failureOnly.push(`${category}:${errorCode ?? ""}`))
    check(`${code} fails closed with code-only log`, result.kind === "unavailable" && result.code === code && failureOnly.join() === `none:${code}`)
  }
  const medium = await evaluateScreening({ items: "A situation requiring review", dietaryNotes: null, neighborhood: "Logan Square" }, async (items) => items.startsWith("A situation")
    ? { approved: false, riskLevel: "medium", categories: ["vulnerable_person_identification"], reason: "Potential concern.", suggestedRewrite: "Winter coats for outreach in Logan Square" }
    : low, () => {})
  check("medium risk keeps separately screened safe candidate", medium.kind === "review" && medium.safeItems === "Winter coats for outreach in Logan Square")

  const [poster] = await db.select().from(users).where(eq(users.email, "test.outreach1@example.com"))
  const [admin] = await db.select().from(users).where(eq(users.email, "test.admin@example.com"))
  const [organization] = await db.select().from(users).where(eq(users.email, "test.donor1@example.com"))
  assert.ok(poster && admin?.isAdmin && organization)
  testRecipients.add(poster.id)
  testRecipients.add(admin.id)
  const actor: Actor = { id: poster.id, role: poster.role }
  const day = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  const request = (items: string) => ({ peopleCount: "5", category: "clothing", items, dietaryNotes: "", neighborhood: "Logan Square", windowStart: `${day}T10:00`, windowEnd: `${day}T12:00` })
  const tag = `[privacy-test-${Date.now()}]`

  const safePost = await createRequest(db, actor, request(`${tag} clean coats`), screenSafe)
  check("low-risk post is published", safePost.ok && !safePost.queued)
  if (safePost.ok) createdRequests.push(safePost.id)
  const blockedPost = await createRequest(db, actor, request(`${tag} blocked`), screenBlocked)
  check("high-risk post is blocked", !blockedPost.ok && blockedPost.privacy?.kind === "blocked")
  const failedPost = await createRequest(db, actor, request(`${tag} unavailable`), screenUnavailable)
  check("screening failure does not publish", !failedPost.ok && failedPost.privacy?.kind === "unavailable")
  for (const code of ["missing_key", "api_error", "invalid_response"] as const) {
    const failed = await createRequest(db, actor, request(`${tag} ${code} retry`), async () => ({ kind: "unavailable", code }))
    check(`${code} submission creates no request`, !failed.ok && failed.privacy?.kind === "unavailable")
  }

  const queued = await createRequest(db, actor, request(`${tag} private original`), async () => ({ kind: "review", categories: ["vulnerable_person_identification"], safeItems: `${tag} safe coats` }))
  check("medium risk enters review", queued.ok && queued.queued)
  if (!queued.ok) return
  createdReviews.push(queued.id)
  const [review] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, queued.id))
  check("review stores no original text", review.safeItems === `${tag} safe coats` && !JSON.stringify(review).includes("private original"))
  const board = await listBoard(db, organization.id)
  check("pending review is absent from board", !!board && !board.some((r) => r.items.includes(`${tag} private original`)))
  check("non-admin cannot read review queue", (await listPrivacyReviews(db, poster.id)) === null)
  check("admin can read review queue", (await listPrivacyReviews(db, admin.id))?.some((r) => r.id === queued.id))
  check("submitter sees own review", (await listMyPrivacyReviews(db, poster.id)).some((r) => r.id === queued.id))
  check("other account cannot see submitter review", !(await listMyPrivacyReviews(db, organization.id)).some((r) => r.id === queued.id))
  check("non-admin cannot approve", !(await decidePrivacyReview(db, poster.id, { id: queued.id, action: "approve" }, screenSafe)).ok)
  check("unsafe final check blocks admin approval", !(await decidePrivacyReview(db, admin.id, { id: queued.id, action: "approve" }, screenBlocked)).ok)
  let finalScreenItems: string | undefined
  const approved = await decidePrivacyReview(db, admin.id, { id: queued.id, action: "approve" }, async (value) => {
    finalScreenItems = value.items
    return screenSafe()
  })
  check("admin publishes safe candidate", approved.ok)
  check("final screening uses the exact stored candidate", finalScreenItems === review.safeItems)
  const [after] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, queued.id))
  check("approval creates one published need", after.status === "approved" && !!after.publishedRequestId)
  if (after.publishedRequestId) createdRequests.push(after.publishedRequestId)
  check("repeat approval cannot duplicate", !(await decidePrivacyReview(db, admin.id, { id: queued.id, action: "approve" }, screenSafe)).ok)

  const queueAgain = async (suffix: string) => {
    const result = await createRequest(db, actor, request(`${tag} ${suffix} original`), async () => ({ kind: "review", categories: ["vulnerable_person_identification"], safeItems: `${tag} ${suffix} safe coats` }))
    assert.ok(result.ok && result.queued)
    createdReviews.push(result.id)
    return result.id
  }
  const changesId = await queueAgain("changes")
  check("admin can request changes", (await decidePrivacyReview(db, admin.id, { id: changesId, action: "changes", reason: "privacy_detail" }, screenSafe)).ok)
  const [changesRow] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, changesId))
  check("changes are private and revision is available", changesRow.status === "changes_requested" && changesRow.publishedRequestId === null)
  check("only owner receives revision draft", (await getRevisionDraft(db, poster.id, changesId))?.safeItems === changesRow.safeItems && await getRevisionDraft(db, organization.id, changesId) === null)
  let rescreenedItems: string | undefined
  const revisedLow = await createRequest(db, actor, request(`${tag} revised low`), async (value) => {
    rescreenedItems = value.items
    return screenSafe()
  }, changesId)
  check("low-risk revision rescreens and publishes", revisedLow.ok && !revisedLow.queued && rescreenedItems === `${tag} revised low`)
  if (revisedLow.ok) createdRequests.push(revisedLow.id)
  const [supersededLow] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, changesId))
  check("published revision supersedes original review", supersededLow.status === "superseded" && supersededLow.publishedRequestId === (revisedLow.ok ? revisedLow.id : null))
  check("superseded review remains in submitter history", (await listMyPrivacyReviews(db, poster.id)).some((r) => r.id === changesId && r.status === "superseded"))
  check("superseded review has no revision draft", await getRevisionDraft(db, poster.id, changesId) === null)
  const duplicateLow = await createRequest(db, actor, request(`${tag} duplicate low`), screenSafe, changesId)
  check("superseded review cannot be submitted again", !duplicateLow.ok && duplicateLow.error === "This revision is no longer available.")

  const mediumChangesId = await queueAgain("medium changes")
  check("admin requests changes before medium revision", (await decidePrivacyReview(db, admin.id, { id: mediumChangesId, action: "changes", reason: "privacy_detail" }, screenSafe)).ok)
  const revisedMedium = await createRequest(db, actor, request(`${tag} revised medium`), async () => ({ kind: "review", categories: ["vulnerable_person_identification"], safeItems: `${tag} revised safe coats` }), mediumChangesId)
  check("medium-risk revision returns to private review", revisedMedium.ok && revisedMedium.queued)
  if (revisedMedium.ok) createdReviews.push(revisedMedium.id)
  const [supersededMedium] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, mediumChangesId))
  const [replacementReview] = revisedMedium.ok ? await db.select().from(privacyReviews).where(eq(privacyReviews.id, revisedMedium.id)) : []
  check("medium revision links new review to superseded review", supersededMedium.status === "superseded" && replacementReview?.status === "pending_review" && replacementReview.supersedesReviewId === mediumChangesId)
  const approvedReplacement = revisedMedium.ok && await decidePrivacyReview(db, admin.id, { id: revisedMedium.id, action: "approve" }, screenSafe)
  const [approvedReplacementRow] = revisedMedium.ok ? await db.select().from(privacyReviews).where(eq(privacyReviews.id, revisedMedium.id)) : []
  check("admin can approve replacement while original remains superseded", !!approvedReplacement && approvedReplacement.ok && approvedReplacementRow?.status === "approved" && supersededMedium.status === "superseded")
  if (approvedReplacementRow?.publishedRequestId) createdRequests.push(approvedReplacementRow.publishedRequestId)

  const highChangesId = await queueAgain("high changes")
  check("admin requests changes before blocked revision", (await decidePrivacyReview(db, admin.id, { id: highChangesId, action: "changes", reason: "privacy_detail" }, screenSafe)).ok)
  const revisedHigh = await createRequest(db, actor, request(`${tag} revised high`), screenBlocked, highChangesId)
  check("high-risk revision stays blocked", !revisedHigh.ok && revisedHigh.privacy?.kind === "blocked")
  check("blocked revision leaves original actionable", (await getRevisionDraft(db, poster.id, highChangesId))?.status === "changes_requested")

  const failureChangesId = await queueAgain("failure changes")
  check("admin requests changes before unavailable revision", (await decidePrivacyReview(db, admin.id, { id: failureChangesId, action: "changes", reason: "privacy_detail" }, screenSafe)).ok)
  const revisedUnavailable = await createRequest(db, actor, request(`${tag} revised unavailable`), screenUnavailable, failureChangesId)
  check("screening failure leaves revision retryable", !revisedUnavailable.ok && revisedUnavailable.privacy?.kind === "unavailable" && (await getRevisionDraft(db, poster.id, failureChangesId))?.status === "changes_requested")
  const retryAfterFailure = await createRequest(db, actor, request(`${tag} revised retry`), screenSafe, failureChangesId)
  check("revision can publish after screening retry", retryAfterFailure.ok && !retryAfterFailure.queued)
  if (retryAfterFailure.ok) createdRequests.push(retryAfterFailure.id)

  const newNotifications = (await db.select().from(notifications)).filter((n) => !beforeNotifications.has(n.id))
  check("resubmission notifications keep changes, pending, approval, and admin events", newNotifications.some((n) => n.userId === poster.id && n.type === "privacy_changes") && newNotifications.some((n) => n.userId === poster.id && n.type === "privacy_pending") && newNotifications.some((n) => n.userId === poster.id && n.type === "privacy_approved") && newNotifications.some((n) => n.userId === admin.id && n.type === "privacy_new_review"))
  const rejectionId = await queueAgain("reject")
  check("admin can reject", (await decidePrivacyReview(db, admin.id, { id: rejectionId, action: "reject", reason: "outside_scope" }, screenSafe)).ok)
  const [rejectionRow] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, rejectionId))
  check("rejected review never publishes", rejectionRow.status === "rejected" && rejectionRow.publishedRequestId === null)
  const raceId = await queueAgain("race")
  const race = await Promise.all([
    decidePrivacyReview(db, admin.id, { id: raceId, action: "approve" }, screenSafe),
    decidePrivacyReview(db, admin.id, { id: raceId, action: "approve" }, screenSafe),
  ])
  const [raceRow] = await db.select().from(privacyReviews).where(eq(privacyReviews.id, raceId))
  check("concurrent approvals publish once", race.filter((r) => r.ok).length === 1 && !!raceRow.publishedRequestId)
  if (raceRow.publishedRequestId) createdRequests.push(raceRow.publishedRequestId)
}

try {
  await run()
} catch {
  console.error("FAIL privacy rule check; submitted text and database errors are withheld")
  process.exitCode = 1
} finally {
  // Replacement reviews reference their historical parent, so remove newest rows first.
  for (const id of createdReviews.toReversed()) await db.delete(privacyReviews).where(eq(privacyReviews.id, id))
  for (const id of createdRequests) await db.delete(foodRequests).where(eq(foodRequests.id, id))
  const current = await db.select({ id: notifications.id, userId: notifications.userId, type: notifications.type }).from(notifications)
  for (const item of current) if (!beforeNotifications.has(item.id) && testRecipients.has(item.userId) && item.type.startsWith("privacy_")) {
    await db.delete(notifications).where(eq(notifications.id, item.id))
  }
  console.log(`${passed} privacy rule checks passed`)
}
