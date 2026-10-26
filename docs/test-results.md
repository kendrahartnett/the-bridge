# Test results: request and response rules

Run: 10/26/2026, 12:58:39 AM (Chicago time) · tag `[claim-test 20261026055825]`

Command: `npm run test:claims` (scripts/test-claim-rules.ts), against the dev database.
The script calls the same rule functions the server actions call (src/lib/request-rules.ts)
with real test users, creates its own fictional requests, and deletes only those afterwards.

Users: outreach Test — Outreach Worker A, Test — Outreach Worker B; organizations Test — Organization A, Test — Organization B, Test — Organization C (pending).
For the verification checks, the run gives test.outreach2 admin rights directly in the database
and removes them afterwards (the app has no way to grant admin), and resets test.donor3 to pending.

**64/64 checks passed.**

| # | Check | Result | Detail |
|---|---|---|---|
| 1 | Organization offers support on an open request → In Progress | PASS | result ok; status claimed (shown as "In Progress") |
| 2 | Inbox: a claim creates exactly one need_claimed notification, for the poster | PASS | 1 notification(s): need_claimed → poster |
| 3 | Second organization cannot offer support on the same request | PASS | "Another organization just claimed this need."; still supported by Test — Organization A |
| 4 | Inbox: a failed claim (already claimed) creates no notification | PASS |  |
| 5 | Outreach user cannot offer support | PASS | "Only organization accounts can claim needs."; status stays open |
| 6 | Inbox: a failed claim (outreach account) creates no notification | PASS |  |
| 7 | Fulfil: creator cannot fulfil while Open | PASS | "No organization has claimed this need yet." |
| 8 | Fulfil: an organization cannot fulfil | PASS | "Only the person who posted this request can change it." |
| 9 | Fulfil: a different outreach user cannot fulfil | PASS | "Only the person who posted this request can change it." |
| 10 | Fulfil: creator fulfils when In Progress → Fulfilled | PASS | status claimed → delivered (shown as "Fulfilled") |
| 11 | Fulfil: cannot fulfil twice | PASS | "This request is already fulfilled." |
| 12 | Inbox: fulfilling creates exactly one need_fulfilled notification, for the claiming organization | PASS | 1 need_fulfilled; to the claiming organization |
| 13 | Inbox: the failed fulfil attempts created nothing else | PASS | 2 notifications on that need (1 claim, 1 fulfilled) |
| 14 | Cancel: an organization cannot cancel | PASS | "Only the person who posted this request can change it." |
| 15 | Cancel: creator cancels while Open → Cancelled | PASS | status cancelled |
| 16 | Inbox: cancelling an Open need creates no notification | PASS |  |
| 17 | Cancel: creator cannot cancel once In Progress | PASS | "An organization already claimed this need, so it can't be cancelled here."; status stays claimed |
| 18 | Different outreach user cannot cancel someone else's request | PASS | "Only the person who posted this request can change it." |
| 19 | Different outreach user cannot fulfil someone else's request | PASS | "Only the person who posted this request can change it." |
| 20 | Invalid category "weapons" is rejected and no row is created | PASS | category error "Choose the type of support."; rows 13 → 13 |
| 21 | Pending organization cannot claim a need | PASS | "Your organization is still under review, so you can't do this yet." |
| 22 | Inbox: a failed claim (pending organization) creates no notification | PASS |  |
| 23 | Pending organization cannot post a need | PASS | "Your organization is still under review, so you can't do this yet." |
| 24 | Inbox: a refused review (not an admin) creates no notification | PASS |  |
| 25 | Non-admin (organization) cannot approve | PASS | "Only admins can review organizations." |
| 26 | Non-admin (outreach) cannot reject | PASS | "Only admins can review organizations."; status stays pending |
| 27 | Review note over 300 characters is refused | PASS | "Keep the note under 300 characters." |
| 28 | Inbox: rejecting creates exactly one org_rejected notification, with no need attached | PASS | org_rejected |
| 29 | Admin can reject; reviewer, time, and note are recorded | PASS | status rejected; reviewed by the admin; note saved |
| 30 | Rejected organization cannot claim a need | PASS | "Your organization wasn't approved, so you can't do this." |
| 31 | Rejected organization cannot post a need | PASS | "Your organization wasn't approved, so you can't do this." |
| 32 | Admin can approve | PASS | status approved |
| 33 | Inbox: approving creates exactly one org_approved notification | PASS | org_rejected, org_approved |
| 34 | Inbox: the organization's notifications never include the admin's review note | PASS | 10 items, fields: id, type, requestId, createdAt, items, claimerName, posterName, read |
| 35 | Approved organization can claim a need | PASS | status claimed |
| 36 | Approved organization can post a need | PASS | created |
| 37 | Organization cannot claim its own post | PASS | "This is your own post, so you can't claim it."; status stays open |
| 38 | Inbox: a failed claim (own post) creates no notification | PASS |  |
| 39 | Inbox: revoking an approval creates exactly one org_rejected notification | PASS | 1 → 2 |
| 40 | Approved organization sees the poster's email on its claim | PASS | email shown |
| 41 | After approval is revoked, the poster's email is hidden on its existing claims | PASS | claim still listed: true; email hidden (null from the query) |
| 42 | Poster still sees who supports the need after a revocation | PASS | "Test — Organization C (pending)" |
| 43 | Revoked organization's open post is hidden from the Needs Board | PASS |  |
| 44 | Nobody can claim a revoked organization's open post | PASS | "This request isn't available right now."; status stays open |
| 45 | Revoked organization still sees that post under Your posts | PASS |  |
| 46 | Approving it again puts the post back on the Needs Board | PASS |  |
| 47 | Race: exactly one of two simultaneous offers succeeds, with exactly one notification (10 runs) | PASS | 10/10 runs correct |
| 48 | Inbox: listing returns only the viewer's own notifications | PASS | 16 items, all outreach1's: true |
| 49 | Inbox: someone else can't open or mark another person's notification | PASS | open by outreach2: null; still unread: true; donor2 marked 2 of its own |
| 50 | Inbox: opening your own need notification marks it read and leads to the need | PASS | /requests/a5c774b0-093e-4775-9331-93dd6ec6ba6e |
| 51 | Inbox: opening an approval notification leads to the dashboard | PASS | /dashboard |
| 52 | Inbox: Mark all as read marks only your own | PASS | marked 14; outreach1 unread now 0; outreach2 still has 1 unread |
| 53 | Board: organizations (approved, pending) see it; outreach accounts get nothing | PASS |  |
| 54 | Need page: another outreach account can't see someone else's need | PASS |  |
| 55 | Need page: the poster and any organization can see an Open need, with no contact | PASS |  |
| 56 | Need page: the claiming organization sees the poster's email; another organization sees none | PASS |  |
| 57 | Need page: once Fulfilled, another organization can't see it | PASS |  |
| 58 | Need page: a need that doesn't exist, or a malformed id, gives nothing | PASS |  |
| 59 | Database rejects status 'claimed' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 60 | Database rejects status 'open' with a claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 61 | Database rejects status 'delivered' with no claimed_by | PASS | "new row for relation "food_requests" violates check constraint "claim_status_consistency"" |
| 62 | Cleanup: seeded notifications are back as they were (read or unread) | PASS | 5 seeded |
| 63 | Cleanup: removed the notifications this run caused (none left behind) | PASS | removed 4 more after the requests' own went with them; left: 0 |
| 64 | Cleanup: deleted only this run's 21 test requests; seeded requests unchanged | PASS | deleted 21/21; seeded rows identical: true; total rows 6 → 6 |

## Race test (10 runs)

Two organizations offer support on the same open request at the same moment (`Promise.all`).

| Run | Winner | Other organization got | Result |
|---|---|---|---|
| 1 | Test — Organization A | Another organization just claimed this need. | PASS |
| 2 | Test — Organization A | Another organization just claimed this need. | PASS |
| 3 | Test — Organization A | Another organization just claimed this need. | PASS |
| 4 | Test — Organization A | Another organization just claimed this need. | PASS |
| 5 | Test — Organization B | Another organization just claimed this need. | PASS |
| 6 | Test — Organization A | Another organization just claimed this need. | PASS |
| 7 | Test — Organization A | Another organization just claimed this need. | PASS |
| 8 | Test — Organization B | Another organization just claimed this need. | PASS |
| 9 | Test — Organization A | Another organization just claimed this need. | PASS |
| 10 | Test — Organization A | Another organization just claimed this need. | PASS |
