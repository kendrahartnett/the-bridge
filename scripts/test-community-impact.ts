// Offline regression checks for the community impact aggregate query.
import assert from "node:assert/strict"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "../src/db/schema.ts"
import { copyFor } from "../src/lib/copy.ts"
import {
  communityImpactQuery,
  getCommunityImpact,
  normalizeCommunityImpact,
} from "../src/lib/request-rules.ts"

const db = drizzle.mock({ schema })
const query = communityImpactQuery(db).toSQL()
const normalizedSql = query.sql.replaceAll('"', "").toLowerCase()

assert.match(normalizedSql, /sum\(coalesce\(people_count, 0\)\) filter \(where status = 'delivered'\)/)
console.log("PASS only delivered requests contribute people_count; null values are coalesced")
assert.match(normalizedSql, /count\(\*\) filter \(where status = 'delivered'\)/)
console.log("PASS each delivered request contributes once to Needs Fulfilled")
assert.match(normalizedSql, /count\(\*\) filter \(where status = 'open' and exists/)
assert.match(normalizedSql, /poster_check\.role = 'outreach' or poster_check\.verification_status = 'approved'/)
assert.doesNotMatch(normalizedSql, /claimed|cancelled|pending_review/)
console.log("PASS Open Requests applies the Needs Board poster visibility rule")
assert.match(normalizedSql, /from food_requests/)
assert.doesNotMatch(normalizedSql, /join /)
assert.doesNotMatch(normalizedSql, /privacy_reviews/)
assert.doesNotMatch(normalizedSql, /items|dietary_notes|neighborhood|email|contact/)
console.log("PASS aggregate reads request rows once and excludes private review records")

assert.deepEqual(
  normalizeCommunityImpact({ estimatedPeopleReached: null as unknown as number, needsFulfilled: undefined, openRequests: 0 }),
  { estimatedPeopleReached: 0, needsFulfilled: 0, openRequests: 0 }
)
console.log("PASS empty and null aggregate results normalize to zero")

const en = copyFor("en").COMMUNITY_IMPACT_COPY
const es = copyFor("es").COMMUNITY_IMPACT_COPY
assert.equal(en.estimatedPeopleReached, "Estimated People Reached")
assert.equal(es.estimatedPeopleReached, "Personas alcanzadas (estimado)")
assert.match(en.explanation, /Individuals may be counted more than once/)
assert.match(es.explanation, /una misma persona se cuente m[aá]s de una vez/)
console.log("PASS English and Spanish impact copy explains estimated, non-unique reach")

const changingRows = [
  { estimatedPeopleReached: 4, needsFulfilled: 1, openRequests: 2 },
  { estimatedPeopleReached: 7, needsFulfilled: 2, openRequests: 1 },
]
const changingDb = {
  select: () => ({ from: async () => [changingRows.shift()] }),
} as never
assert.deepEqual(await getCommunityImpact(changingDb), { estimatedPeopleReached: 4, needsFulfilled: 1, openRequests: 2 })
assert.deepEqual(await getCommunityImpact(changingDb), { estimatedPeopleReached: 7, needsFulfilled: 2, openRequests: 1 })
console.log("PASS each call reads fresh aggregate totals after status changes")

console.log("All community impact checks passed")
