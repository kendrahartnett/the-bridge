# Test results: request and response rules

Run: 10/25/2026, 11:51:45 AM (Chicago time) · tag `[claim-test 20261025165138]`

Command: `npm run test:claims` (scripts/test-claim-rules.ts), against the dev database.
The script calls the same rule functions the server actions call (src/lib/request-rules.ts)
with real test users, creates its own fictional requests, and deletes only those afterwards.

Users: outreach Test — Outreach Worker A, Test — Outreach Worker B; organizations Test — Organization A, Test — Organization B, Test — Organization C (pending).
For the verification checks, the run gives test.outreach2 admin rights directly in the database
and removes them afterwards (the app has no way to grant admin), and resets test.donor3 to pending.

**38/38 checks passed.**

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Organization offers support on an open request → In Progress | PASS | result ok; status claimed (shown as "In Progress") |
| 2 | Second organization cannot offer support on the same request | PASS | "Someone else just offered support for this request."; still supported by Test — Organization A |
| 3 | Outreach user cannot offer support | PASS | "Only organization accounts can offer support."; status stays open |
| 4 | Fulfil: creator cannot fulfil while Open | PASS | "No organization has offered support for this request yet." |
| 5 | Fulfil: an organization cannot fulfil | PASS | "Only the person who posted this request can change it." |
| 6 | Fulfil: a different outreach user cannot fulfil | PASS | "Only the person who posted this request can change it." |
| 7 | Fulfil: creator fulfils when In Progress → Fulfilled | PASS | status claimed → delivered (shown as "Fulfilled") |
| 8 | Fulfil: cannot fulfil twice | PASS | "This request is already fulfilled." |
| 9 | Cancel: an organization cannot cancel | PASS | "Only the person who posted this request can change it." |
| 10 | Cancel: creator cancels while Open → Cancelled | PASS | status cancelled |
| 11 | Cancel: creator cannot cancel once In Progress | PASS | "An organization is already supporting this request, so it can't be cancelled here."; status stays claimed |
| 12 | Different outreach user cannot cancel someone else's request | PASS | "Only the person who posted this request can change it." |
| 13 | Different outreach user cannot fulfil someone else's request | PASS | "Only the person who posted this request can change it." |
| 14 | Invalid category "weapons" is rejected and no row is created | PASS | category error "Choose the type of support."; rows 13 → 13 |
| 15 | Pending organization cannot claim a need | PASS | "Your organization is still under review, so you can't do this yet." |
| 16 | Pending organization cannot post a need | PASS | "Your organization is still under review, so you can't do this yet." |
| 17 | Non-admin (organization) cannot approve | PASS | "Only admins can review organizations." |
| 18 | Non-admin (outreach) cannot reject | PASS | "Only admins can review organizations."; status stays pending |
| 19 | Review note over 300 characters is refused | PASS | "Keep the note under 300 characters." |
| 20 | Admin can reject; reviewer, time, and note are recorded | PASS | status rejected; reviewed by the admin; note saved |
| 21 | Rejected organization cannot claim a need | PASS | "Your organization wasn't approved, so you can't do this." |
| 22 | Rejected organization cannot post a need | PASS | "Your organization wasn't approved, so you can't do this." |
| 23 | Admin can approve | PASS | status approved |
| 24 | Approved organization can claim a need | PASS | status claimed |
| 25 | Approved organization can post a need | PASS | created |
| 26 | Organization cannot claim its own post | PASS | "This is your own post, so you can't offer support on it."; status stays open |
| 27 | Approved organization sees the poster's email on its claim | PASS | email shown |
| 28 | After approval is revoked, the poster's email is hidden on its existing claims | PASS | claim still listed: true; email hidden (null from the query) |
| 29 | Poster still sees who supports the need after a revocation | PASS | "Test — Organization C (pending)" |
| 30 | Revoked organization's open post is hidden from the Needs Board | PASS |  |
| 31 | Nobody can claim a revoked organization's open post | PASS | "This request isn't available right now."; status stays open |
| 32 | Revoked organization still sees that post under Your posts | PASS |  |
| 33 | Approving it again puts the post back on the Needs Board | PASS |  |
| 34 | Race: exactly one of two simultaneous offers succeeds (10 runs) | PASS | 10/10 runs correct |
| 35 | Database rejects status 'claimed' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 36 | Database rejects status 'open' with a claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 37 | Database rejects status 'delivered' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 38 | Cleanup: deleted only this run's 20 test requests; seeded requests unchanged | PASS | deleted 20/20; seeded rows identical: true; total rows 6 → 6 |

## Race test (10 runs)

Two organizations offer support on the same open request at the same moment (`Promise.all`).

| Run | Winner | Other organization got | Result |
|---|---|---|---|
| 1 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 2 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 3 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 4 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 5 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 6 | Test — Organization B | Someone else just offered support for this request. | PASS |
| 7 | Test — Organization B | Someone else just offered support for this request. | PASS |
| 8 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 9 | Test — Organization B | Someone else just offered support for this request. | PASS |
| 10 | Test — Organization A | Someone else just offered support for this request. | PASS |
