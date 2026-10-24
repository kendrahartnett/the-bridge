# Test results: request and response rules

Run: 10/24/2026, 12:31:53 PM (Chicago time) · tag `[claim-test 20261024173150]`

Command: `npm run test:claims` (scripts/test-claim-rules.ts), against the dev database.
The script calls the same rule functions the server actions call (src/lib/request-rules.ts)
with real test users, creates its own fictional requests, and deletes only those afterwards.

Users: outreach Test — Outreach Worker A, Test — Outreach Worker B; organizations Test — Organization A, Test — Organization B.

**19/19 checks passed.**

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Organization offers support on an open request → In Progress | PASS | result ok; status claimed (shown as "In Progress") |
| 2 | Second organization cannot offer support on the same request | PASS | "Someone else just offered support for this request."; still supported by Test — Organization A |
| 3 | Outreach user cannot offer support | PASS | "Only organization accounts can offer support."; status stays open |
| 4 | Fulfil: creator cannot fulfil while Open | PASS | "No organization has offered support for this request yet." |
| 5 | Fulfil: an organization cannot fulfil | PASS | "Only the outreach worker who made this request can change it." |
| 6 | Fulfil: a different outreach user cannot fulfil | PASS | "Only the outreach worker who made this request can change it." |
| 7 | Fulfil: creator fulfils when In Progress → Fulfilled | PASS | status claimed → delivered (shown as "Fulfilled") |
| 8 | Fulfil: cannot fulfil twice | PASS | "This request is already fulfilled." |
| 9 | Cancel: an organization cannot cancel | PASS | "Only the outreach worker who made this request can change it." |
| 10 | Cancel: creator cancels while Open → Cancelled | PASS | status cancelled |
| 11 | Cancel: creator cannot cancel once In Progress | PASS | "An organization is already supporting this request, so it can't be cancelled here."; status stays claimed |
| 12 | Different outreach user cannot cancel someone else's request | PASS | "Only the outreach worker who made this request can change it." |
| 13 | Different outreach user cannot fulfil someone else's request | PASS | "Only the outreach worker who made this request can change it." |
| 14 | Invalid category "weapons" is rejected and no row is created | PASS | category error "Choose the type of support."; rows 13 → 13 |
| 15 | Race: exactly one of two simultaneous offers succeeds (10 runs) | PASS | 10/10 runs correct |
| 16 | Database rejects status 'claimed' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 17 | Database rejects status 'open' with a claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 18 | Database rejects status 'delivered' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 19 | Cleanup: deleted only this run's 18 test requests; seeded requests unchanged | PASS | deleted 18/18; seeded rows identical: true; total rows 6 → 6 |

## Race test (10 runs)

Two organizations offer support on the same open request at the same moment (`Promise.all`).

| Run | Winner | Other organization got | Result |
|---|---|---|---|
| 1 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 2 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 3 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 4 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 5 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 6 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 7 | Test — Organization B | Someone else just offered support for this request. | PASS |
| 8 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 9 | Test — Organization A | Someone else just offered support for this request. | PASS |
| 10 | Test — Organization A | Someone else just offered support for this request. | PASS |
