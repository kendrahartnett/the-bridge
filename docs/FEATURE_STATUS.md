# Feature status

Feature-by-feature state of The Bridge, originally checked at commit `8919481` on 2026-10-27 and updated for the local privacy-screening work. "Tested" means an automated test in this repo covers it; the test that does is named.

**Legend:** ✅ Complete (built and covered by tests) · 🟡 Partial (built, with a known gap) · 📋 Planned (not built) · ⛔ Blocked (waiting on a decision or an outside party)

## Summary

| Area | Status |
|---|---|
| Accounts and sign-in (outreach, organization, admin) | ✅ |
| Organization verification (admin review) | ✅ (manual only) |
| Post a Need | ✅ |
| Needs Board and need pages | ✅ |
| Claim / fulfil / cancel workflow | ✅ |
| Contact sharing after a claim | ✅ |
| Inbox notifications | ✅ (in-app only) |
| Dashboards | ✅ |
| AI assistant (chat) | ✅ |
| English / Spanish | ✅ (existing Spanish copy verified by two fluent speakers) |
| Light / dark themes | ✅ |
| Not-found page (branded, real 404, works without JS) | ✅ |
| Accessibility and responsive layout | ✅ |
| Secret redaction in scripts | ✅ |
| Production migration script | ✅ |
| **AI screening and admin privacy review** | ✅ (implemented locally; synthetic live Anthropic calls tested) |
| Email / text alerts | 📋 |
| Neighborhood map | 📋 |
| Needs Board filters | 📋 |
| Automated EIN verification | 📋 |
| Organization confirms receipt; completion note | 📋 |
| Phone / text contact options on posts | 📋 |
| Services beyond essential resources (medical, housing, …) | 📋 |
| Security advisory: zod inside `@neondatabase/auth` | ⛔ (deferred by decision; needs an auth package upgrade) |

---

## Accounts and sign-in ✅

- **What:** email and password sign-in; two account types chosen once at sign-up: "I'm posting needs" (role `outreach`) and "I'm an organization" (role `donor`, with organization name, `https` website, optional EIN `NN-NNNNNNN`, contact name). Both sign-ups require a pledge checkbox. Admin is a flag (`users.is_admin`) granted only with `npm run admin:grant -- <email>` (or `admin:grant:prod`), never in the app.
- **Where:** `src/app/[lang]/sign-in/` (page, `actions.ts`, forms), `src/lib/auth/server.ts` (Neon Auth), `src/app/api/auth/[...path]/route.ts` (Neon Auth handler), `src/lib/current-user.ts` (session → `users` row by email), `src/lib/auth/failure-code.ts` (maps Neon Auth errors to friendly messages), `src/lib/validation.ts`.
- **How:** Neon Auth (`@neondatabase/auth` 0.7.0-beta) holds passwords and sessions; the app keeps its own `users` row keyed by email for role and verification.
- **Tests:** `e2e:signin`, `e2e:dashboards`, `e2e:nav`, `e2e:verification` (`-- --signups` also creates real accounts through the forms; it works once until those accounts are deleted).
- **Limitations:** Neon Auth is a beta package. No password reset or email verification flow in the app. In production, sign-in was blocked by `INVALID_ORIGIN` until `https://the-bridge-one.vercel.app` was added as a trusted domain; the domain is now listed (checked 2026-10-27), but no record shows a live sign-in was re-tested afterwards (see the roadmap).

## Organization verification ✅ (manual only)

- **What:** new organizations start `pending`; they can browse the Needs Board but can't claim or see contact details. An admin approves, rejects, or later revokes, with an internal note (≤300 chars) never shown to the organization. Banners on the dashboard explain the state; `ADMIN_CONTACT_EMAIL`, if set, is shown for questions.
- **Where:** `src/app/[lang]/admin/` (page, `actions.ts`, `review-actions.tsx`), `reviewOrganization` / `listOrganizationsForReview` / `isAdminAccount` in `src/lib/request-rules.ts`, `src/components/verification-banner.tsx`.
- **Tests:** `test:claims` (approval, rejection, revocation rules), `e2e:admin`, `e2e:verification`, `e2e:notices`.
- **Limitations:** no automated EIN or website check; no email to admins when someone applies.

## Post a Need ✅

- **What:** form with type of support (Food, Clothing, Hygiene supplies, Other), items (≤200), people (1–500), Chicago community area (dropdown of the official list), optional notes (≤300), and a time window (read as Chicago time). Shows a privacy notice and per-field guidance not to include names, health details, or exact locations.
- **Who:** outreach accounts and **approved** organizations (`canPostNeeds`).
- **Where:** `src/app/[lang]/requests/new/` (`page.tsx`, `new-request-form.tsx`, `actions.ts`), `createRequest` in `src/lib/request-rules.ts`, `newRequestSchema` in `src/lib/validation.ts`, `src/lib/neighborhoods.ts`, `src/lib/chicago-time.ts`.
- **Tests:** `test:claims` (create rules), `e2e:form` (privacy notice, contrast, layout), `e2e:dropdown`, `e2e:responsive`, `e2e:a11y`.
- **Limitations:** automated screening can miss sensitive details or flag harmless text. See "AI screening" below.

## Needs Board and need pages ✅

- **What:** `/board` shows open and in-progress needs as sticky notes (tilted cards, a "Claimed" stamp, three-line clamp) to organization accounts (pending ones can browse). `/requests/[id]` shows one need with a status timeline (posted, claimed, fulfilled or cancelled) to the people allowed to see it. Everyone else gets the identical not-found page with HTTP 404.
- **Where:** `src/app/[lang]/board/page.tsx`, `src/app/[lang]/requests/[id]/page.tsx`, `src/components/sticky-note.tsx`, `request-detail-layout.tsx`, `request-card.tsx`, `canViewBoard` / `listBoard` / `getRequestForViewer` in `request-rules.ts`, access gate in `src/proxy.ts`.
- **Tests:** `e2e:board` (190 checks: access by account type and HTTP status, emails present or absent in the HTML, layout, contrast, keyboard), `test:claims`, `e2e:not-found`.
- **Limitations:** no filters or search; no real-time updates (refresh to see changes); open needs from a revoked or rejected organization are hidden until it is approved again (by design).

## Claim, fulfil, cancel ✅

- **What:** an approved organization claims an open need (not its own); the poster marks a claimed need fulfilled, or cancels an open one. Statuses in the database: `open`, `claimed` (shown "In Progress"), `delivered` (shown "Fulfilled"), `cancelled`. Times are recorded (`claimed_at`, `fulfilled_at`, `cancelled_at`).
- **Where:** `claimRequest`, `confirmDelivery`, `cancelRequest` in `src/lib/request-rules.ts`; actions in `src/app/[lang]/dashboard/actions.ts`; `request-action-button.tsx`.
- **How:** each check is repeated inside the SQL `UPDATE`, and the matching notification is inserted in the same statement, so two organizations claiming at the same moment can't both win and a notification exists exactly when the change does. Database CHECK constraints also enforce status/claimer consistency.
- **Tests:** `test:claims` (64 checks, including a 10-round race of two simultaneous claims), `e2e:contact`, `e2e:board`.
- **Limitations:** "resource delivery" happens outside the app: after a claim the two sides email each other to arrange the handoff. There is no in-app messaging, scheduling, or delivery tracking, and the organization can't confirm receipt.

## Contact sharing ✅

- **What:** after a claim, the poster sees the organization's email and the organization sees the poster's, with a note not to share details of the people being served. Hidden emails are never sent to the browser.
- **Where:** `listMyPosts`, `listMySupported`, `getRequestForViewer` in `request-rules.ts`; `CONTACT_COPY`.
- **Tests:** `e2e:contact`, `e2e:board`, `test:claims`.

## Inbox notifications ✅ (in-app only)

- **What:** events `need_claimed` (to the poster), `need_fulfilled` (to the claiming organization), `org_approved` and `org_rejected` (to the organization). Shown at the top of the dashboard and behind a header bell with an unread count (9+ cap). Opening one marks it read and goes to the need or the dashboard; "mark all read" is available.
- **Where:** `notifications` table (migration `0006`), `listNotifications` / `countUnread` / `openNotification` / `markAllNotificationsRead` in `request-rules.ts`, `src/app/[lang]/dashboard/inbox.tsx`, `inbox-actions.ts`, `src/components/site-header.tsx`.
- **Tests:** `test:claims`, `e2e:board`.
- **Limitations:** no email or text delivery; no real-time push.

## Dashboards ✅

- **What:** one `/dashboard` that adapts to the account: inbox, the person's posted needs with actions, needs the organization supports, impact stats, the latest open needs for organizations, and status banners for pending or rejected organizations. Admin accounts see the normal outreach dashboard plus an Admin link.
- **Where:** `src/app/[lang]/dashboard/page.tsx` and its components; `impact-stat.tsx`.
- **Tests:** `e2e:dashboards`, `e2e:nav`, `e2e:a11y`, `e2e:responsive`.

## AI assistant ✅

- **What:** a chat panel on every page that explains The Bridge, its pathways, statuses, and mission, in the language of the question. Three suggested questions, 10 questions per browser session, 500 characters per message, 20 requests per IP per hour. On any failure, timeout, refusal, or missing key it shows a fixed friendly fallback. Disclosure line ("You're chatting with an AI assistant…") and a 988 crisis line in the panel footer.
- **Where:** `src/app/api/chat/route.ts`, `src/lib/assistant-prompt.ts` (system prompt, server-only), `src/lib/assistant-config.ts` (model `claude-haiku-5-5`, 600 max tokens, 15 s timeout), `src/lib/assistant-reply.ts` (reply clean-up), `src/lib/rate-limit.ts`, `src/components/assistant/assistant-chat.tsx`.
- **Safety rules in the prompt:** no medical, legal, immigration, or financial advice; never ask for or repeat names or locations; refers to the person as "your friend"; brief 988/911 response to self-harm mentions; resists prompt injection.
- **Tests:** `test:assistant-reply` (19), `e2e:panel` (234; `-- --live` sends one real question), `docs/assistant-tests.md` (manual conversation tests).
- **Limitations:** the rate limit lives in each server instance's memory, so on Vercel it is per instance, not global; the 10-question limit resets on refresh; the assistant is told about privacy but can't stop someone from typing personal details into the chat (they go to Anthropic with the request, and are neither stored nor logged by the app).
- **Most recent change:** `8919481` gave the panel 8px corners and a new "Send" button (see CODEX_HANDOFF §8).

## English / Spanish ✅

- **What:** EN / ES switch in the header (compact radio group with a tooltip, 44px tap areas); choice saved in a `lang` cookie for a year; first visit follows the browser's language. Pages render on the server in the chosen language; addresses don't change. Validation and rule messages are translated (`translateMessage`). The not-found page follows the cookie too.
- **Where:** `src/lib/copy.ts` (all strings, both languages), `src/lib/i18n.ts`, `src/lib/i18n-server.ts`, `src/proxy.ts`, `src/components/lang-switch.tsx`, `src/app/[lang]/`.
- **Tests:** `e2e:spanish` (168), `e2e:nav`, any suite with `-- --lang=es`.
- **Review:** the existing Spanish copy, including privacy and handoff wording, was reviewed and verified by two fluent Spanish speakers.

## Themes ✅

Light and dark (dark by default, `next-themes`), toggle in the header. Without JavaScript pages show the light theme. Tests: `e2e:a11y`, `e2e:responsive` run both themes.

## Not-found page ✅

Branded illustration, "Page not found", "Back to homepage"; server-rendered with HTTP 404 for unknown addresses and for pages the viewer may not see; works with JavaScript off; follows the language cookie. Where: `src/app/global-not-found.tsx`, `src/app/[lang]/not-found.tsx`, `src/components/not-found-view.tsx`. Tests: `e2e:not-found` (59).

## Accessibility and responsive layout ✅

44px targets, real-pixel contrast checks, one h1 per page, landmarks, named controls, alt text, reduced motion, no horizontal scroll from 320 to 1440px, both themes. Tests: `e2e:a11y` (115), `e2e:responsive` (145), plus checks inside every suite. Report: `docs/responsive-audit.md`.

## Operations ✅

- **Secret redaction:** `src/lib/redact.ts`; `test:redact` (11).
- **Production migrations:** `scripts/migrate-production.ts` (needs `-- --confirm`; prints "Applied N migrations: …"); `scripts/migrate-summary.ts`; `test:migrate-summary` (8). Run only by the owner.
- **Dev-only guard:** `src/db/dev-guard.ts` stops seeding and tests from touching anything but `the-bridge-dev`.
- **Seed:** `npm run db:seed` (6 test users, 6 test needs, notifications).

---

## AI screening and admin privacy review ✅

- **Creation path:** `createRequest` validates account standing and form fields, then screens items and notes. Deterministic checks catch clear addresses, units, coordinates, and map links. The server-only Anthropic classifier handles contextual risk and returns validated JSON. High risk is returned for revision; medium risk enters a private queue only after a suggested safe candidate passes a second screening; low risk publishes. A missing key, timeout, invalid response, or API error does not publish.
- **Admin path:** `/admin/privacy` shows only safe candidates to admins. Approval screens the exact candidate again, then uses one SQL statement to publish, mark the review approved, and notify the submitter. Admins can also request changes or reject; submitters see status and a safe draft on their dashboard.
- **Storage:** migration `0007` adds `privacy_flagged` and `privacy_categories` to published needs, a `privacy_reviews` table for safe drafts and category names, and content-free notification types. Migration `0008` adds the terminal `superseded` lifecycle state and links a replacement review to its historical predecessor. No original blocked or medium-risk text or model response is persisted in the queue.
- **Tests:** `test:privacy-rules` (64 mocked and development-database checks), `test:claims` (64 existing checks), `test:assistant-reply` (19 checks), lint, TypeScript, and build passed locally. Targeted local browser checks exercised synthetic low-, medium-, and high-risk submissions, revision, missing-key failure, admin decisions, statuses, notifications, and light/dark phone and desktop layouts. Live Anthropic calls were made only with synthetic form text; the full browser suites were not run.
- **Limitations:** automated classification can miss details; medium-risk suggestions need a fresh passing screen and may be unavailable. New Spanish privacy wording, including “Revisada y reenviada,” needs native-speaker review before deployment. Production migrations `0007` and `0008` have not been applied.

---

## Planned (from the README roadmap and known limitations) 📋

- Phone and text contact options on posts, and a completion note.
- Email alerts for new organization applications and claims.
- Automated EIN verification.
- A neighborhood map showing needs by area, without exact locations.
- Filters on the Needs Board.
- A step where the organization confirms receipt.
- Services beyond essential resources (medical care, documents, benefits, addiction and mental health support, employment, education, housing).
- A shared rate-limit store (exact limits across Vercel instances).

## Blocked / deferred ⛔

- **zod below 4.6.6 bundled inside `@neondatabase/auth` (high, GHSA-mrhx-c7xc-m3w5).** Deferred by the owner on 2026-10-24 until the auth package is upgraded; recorded in `docs/security-notes.md`. The app's own zod (4.6.7) is patched.
