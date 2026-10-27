# Codex handoff: The Bridge

Prepared by Claude Code on 2026-10-27 for the move to OpenAI Codex. Everything here was checked against the repository at commit `8919481` on `main`; where something could not be confirmed from the code, it says so.

Companion documents:

- [AI_CONTEXT.md](AI_CONTEXT.md): rules that must never be broken (privacy, secrets, brand). **Read first.**
- [FEATURE_STATUS.md](FEATURE_STATUS.md): every feature with its status, files, and tests.
- [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md): prioritized remaining work.
- [../README.md](../README.md): setup, scripts, and test commands (accurate as of this handoff).
- [design-system.md](design-system.md): the full design system and its decisions.

---

## 1. What The Bridge is

A Chicago web app that connects **outreach workers and community members**, who post needs, with **local organizations**, which claim and supply them, to support people experiencing homelessness. It currently covers essential resources (food, clothing, hygiene supplies, other items). People experiencing homelessness don't use the app themselves.

Core loop: **post a need → an approved organization claims it → both sides see each other's email and arrange the handoff → the poster marks it fulfilled.** Privacy is the central design constraint: no names, addresses, or exact locations of the people served are ever stored; location is a Chicago community area only.

Live: https://the-bridge-one.vercel.app · Repository: https://github.com/kendrahartnett/the-bridge · Owner: Kendra Anne Hartnett.

## 2. Architecture

```
Browser ──► src/proxy.ts (every page request)
              │  1. language from the "lang" cookie (or Accept-Language on first visit)
              │  2. unknown address → global-not-found (HTTP 404)
              │  3. /admin, /board, /requests/[id]: allowed? else the same 404
              │  4. /dashboard, /requests/*: signed in? else → /sign-in
              ▼  rewrite to /en/… or /es/… (the address never changes)
          src/app/[lang]/…  (server components, Cache Components)
              │  read through src/lib/request-rules.ts (every permission check)
              │  write through server actions → the same rule functions
              ▼
          Drizzle ORM ──► Neon Postgres (the-bridge / the-bridge-dev)
          Neon Auth (managed passwords + sessions) ◄── src/lib/auth/server.ts
          /api/chat ──► Anthropic API (the assistant only)
```

Key points:

- **Next.js 16.4.3** App Router with `cacheComponents: true`, `partialPrefetching: true`, and `experimental.globalNotFound`. The root layout is `src/app/[lang]/layout.tsx`; `generateStaticParams` gives `en` and `es`, read through `next/root-params`.
- **`src/proxy.ts`** is Next 16's renamed middleware. It checks access *before* a page starts streaming, so a forbidden page returns a true 404 status; each page checks again.
- **One rules module.** `src/lib/request-rules.ts` decides who can post, claim, fulfil, cancel, review, view the board, view a need, and see which emails. Pages and actions call it; the UI never decides permissions alone.
- **Atomic writes.** Each state change re-checks its conditions inside the SQL `UPDATE`, and its notification is inserted in the same statement (a CTE). That makes concurrent claims safe and keeps notifications exactly in step.
- **Shared validation.** `src/lib/validation.ts` (zod) runs in the browser for instant feedback and on the server as the real check.
- **Copy and language.** `src/lib/copy.ts` holds every visible string in English and Spanish (`copyFor(lang)`); servers use `getCopy()` / `requestLang()` (`src/lib/i18n-server.ts`), clients use `useCopy()` / `useLang()` (`src/components/providers.tsx`).

## 3. Technologies and dependencies

| Layer | Package (version in `package.json`) |
|---|---|
| Framework | `next` 16.4.3, `react` / `react-dom` 19.3.0, TypeScript 5 |
| Styling | Tailwind CSS 4 (`@tailwindcss/turbopack`), `tw-animate-css`, shadcn/ui components on `radix-ui` 1.8, `class-variance-authority`, `cn` |
| Motion and icons | `motion` 14.6, `lucide-react` |
| Forms | `react-hook-form` 7, `@hookform/resolvers`, `zod` 4.6.7 |
| Data | `drizzle-orm` 0.45, `drizzle-kit` 0.31, `@neondatabase/serverless` 1.2 |
| Auth | `@neondatabase/auth` 0.7.0-beta (Neon Managed Better Auth) |
| AI | `@anthropic-ai/sdk` 1.3 |
| UI extras | `next-themes`, `sonner` (toasts) |
| Lint | ESLint 9 with `eslint-config-next` 16.4.3 |

No test framework is installed: tests are plain Node TypeScript scripts (`scripts/test-*.ts`) and headless Chrome driven over the DevTools protocol (`scripts/e2e/`). Scripts run `.ts` files directly with Node (22.18+; development used Node 24 on Windows 11).

## 4. Database

Two Neon projects (Postgres 18, `aws-us-east-2`): **`the-bridge`** (production, branch `production`) and **`the-bridge-dev`** (development and tests). Schema: `src/db/schema.ts`. Connection: `src/db/index.ts` (Neon HTTP driver).

| Table | Purpose | Notable constraints |
|---|---|---|
| `users` | App account: email (unique), display name, `role` (`outreach` \| `donor`), organization name, website, EIN, contact name, `verification_status`, review fields, `is_admin` | role/verification consistency; EIN format `NN-NNNNNNN`; review note ≤300; `reviewed_by` → set null on delete |
| `food_requests` | A need: creator, people (1–500), `category`, `items` (≤200), `dietary_notes` (≤300), `neighborhood` (must be one of Chicago's 77 community areas), time window, `status`, `claimed_by`, `claimed_at` / `fulfilled_at` / `cancelled_at` | window end > start; status ↔ claimer consistency; indexes on creator and status |
| `notifications` | Inbox events: user, optional need, `type`, created, read | need events must reference a need, account events must not; cascade on delete |

Enums: `user_role`, `request_status` (`open`, `claimed`, `delivered`, `cancelled`; shown as Open, In Progress, Fulfilled, Cancelled), `request_category` (`food`, `clothing`, `hygiene`, `other`), `verification_status` (`not_required`, `pending`, `approved`, `rejected`), `notification_type` (`need_claimed`, `need_fulfilled`, `org_approved`, `org_rejected`).

Migrations (`drizzle/`, generated by `npm run db:generate`):

| # | File |
|---|---|
| 0000 | `0000_init.sql` |
| 0001 | `0001_claim_status_check.sql` |
| 0002 | `0002_resource_category.sql` |
| 0003 | `0003_organization_verification.sql` |
| 0004 | `0004_reviewed_by_set_null.sql` |
| 0005 | `0005_request_status_times.sql` |
| 0006 | `0006_notifications.sql` |

Workflow: change `schema.ts` → `npm run db:generate` → show the SQL to the owner → `npm run db:migrate` (development) → owner approves → owner runs `npm run db:migrate:prod -- --confirm`. Agents never run the production command.

The table is still named `food_requests` and the organization role `donor` for historical reasons; the UI says "need" and "organization". Renaming them would mean a migration and broad changes, so leave them unless the owner asks.

## 5. Authentication and authorization

- **Authentication:** Neon Auth (`src/lib/auth/server.ts`, `createNeonAuth`) stores passwords and issues session cookies signed with `NEON_AUTH_COOKIE_SECRET`. `/api/auth/[...path]` is its handler. `src/lib/current-user.ts` reads the session and loads the `users` row **by email**. Sign-in, sign-up, and sign-out are server actions in `src/app/[lang]/sign-in/actions.ts`; Neon Auth's error messages are mapped to friendly copy by `src/lib/auth/failure-code.ts`.
- **Authorization** (`src/lib/request-rules.ts`):
  - **Post a need:** outreach accounts and approved organizations.
  - **Claim:** approved organizations, never their own need.
  - **Fulfil:** the poster, once claimed. **Cancel:** the poster, while open.
  - **Needs Board:** organization accounts (pending ones can browse; rejected ones can't).
  - **Need page:** decided per viewer by `getRequestForViewer`.
  - **Admin:** `users.is_admin`, granted only by `npm run admin:grant -- <email>` / `admin:grant:prod`.
  - **Contact emails:** only between the poster and the claiming organization, after the claim, while the organization is approved.
- Each production and development project has its own Neon Auth, so accounts never cross. Production's trusted domain list contains `https://the-bridge-one.vercel.app` (checked 2026-10-27).

## 6. API endpoints and integrations

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | The assistant. Body `{ messages: [{ role, content }] }`; replies `{ reply, source: "assistant" \| "fallback" }` or `{ error, code }` (`too_long`, `empty`, `session_limit`, `rate_limited`, `invalid`). |
| `/api/auth/[...path]` | GET/POST | Neon Auth handler. |
| Server actions | — | `signInAction`, `signUpAction`, `signOutAction`; `createRequestAction`; `claimRequestAction`, `confirmDeliveryAction`, `cancelRequestAction`; `reviewOrganizationAction`; `openNotificationAction`, `markAllReadAction`. |

External services: **Neon** (Postgres and Auth), **Anthropic** (assistant only), **Vercel** (hosting), **Google Fonts** via `next/font` (Geist, Geist Mono, Raleway; self-hosted at build). No email, SMS, maps, or analytics services.

### AI integration (current uses)

Only one: **the Bridge assistant.**

- Route `src/app/api/chat/route.ts`; model `claude-haiku-5-5`, `max_tokens` 600, thinking disabled, 15 s timeout, no retries (`src/lib/assistant-config.ts`).
- System prompt `src/lib/assistant-prompt.ts` (`server-only`, never sent to the browser). It embeds the mission and the Spanish glossary from `copy.ts`.
- Order of checks: rate limit (20/hour/IP, in memory) → body validation → turn alternation → 10-question and 500-character limits → API call. Missing key, error, timeout, or refusal → fixed fallback reply. Replies are cleaned by `src/lib/assistant-reply.ts`.
- Nothing is stored server-side; message text is never logged (failures log only the error kind).

**AI screening of request text is not implemented.** See §10.

## 7. Environment variables (names and purposes only)

| Variable | Purpose | Where |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection (server only) | `.env.local` (dev), Vercel (prod), `.env.prod.local` for the owner's production scripts |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint | `.env.local`, Vercel |
| `NEON_AUTH_COOKIE_SECRET` | Signs session cookies (≥32 chars) | `.env.local`, Vercel |
| `ANTHROPIC_API_KEY` | Assistant (without it the fallback reply is used) | `.env.local`, Vercel |
| `ADMIN_CONTACT_EMAIL` | Address shown to organizations about their review | `.env.local` optional, Vercel recommended |
| `SEED_TEST_PASSWORD` | Password of the seeded test accounts | `.env.local` only (seed and tests) |
| `E2E_BASE_URL` | Browser tests' server (default `http://localhost:3100`) | optional |
| `CHROME_PATH` | Chrome location for browser tests | optional |

`.env.example` (committed, no values) lists the first four. Never name a file `.env.production.local` (Next would load it and override `.env.local`).

## 8. Deployment and project structure

- **Vercel**, auto-deploy on push to `main`. The owner manages Vercel settings; agents must not change them.
- A failed Vercel build once came from a type error that a cached local build hid. **Always** run `rm -rf .next && npm run build` before committing.

```
src/app/[lang]/        pages: / (home), sign-in, dashboard, board, admin, requests/new, requests/[id]
src/app/api/           chat (assistant), auth (Neon Auth)
src/app/global-not-found.tsx, fonts.ts, globals.css (design tokens and shared styles)
src/components/        header, nav, lang switch, theme toggle, request card, sticky note,
                       detail layout, notices, assistant/, brand/ (logo, arch, loader), ui/ (shadcn)
src/lib/               request-rules, validation, copy, i18n, auth, assistant-*, rate-limit,
                       redact, neighborhoods, chicago-time, labels
src/db/                schema, connection, seed, dev-guard
src/proxy.ts           language + access gate
drizzle/               migrations 0000–0006 and snapshots
scripts/               test-*.ts, admin-grant, migrate-production, migrate-summary; e2e/ suites
docs/                  this handoff, design system, test reports, security notes
public/images/         hero, artwork, not-found, sticky-note-card; public/brand/ logos
design/source/         original logo artwork
AGENTS.md              managed by `next dev` (Codex reads this file)
```

## 9. UI/UX and branding

The established identity. Preserve it unless the owner asks for a change. Full specification: [design-system.md](design-system.md).

**Direction:** warm, civic, hopeful; editorial rather than corporate. A golden arch/bridge motif, bold flat illustration (Chicago skyline, a yellow bridge, two people crossing), deep blues with gold.

**Color tokens** (`src/app/globals.css`, `:root` and `.dark`):

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f5f2ea` warm ivory | `#020617` slate-950 |
| `--foreground` | `#19354a` deep navy | `#f5f2ea` |
| `--primary` | `#1f4e79` | `#6fa8d6` |
| `--primary-text` | `#1f4e79` | `#8cbbe3` |
| `--surface` | `#ffffff` | `#0b1220` |
| `--muted` / `--muted-foreground` | `#e8e3d6` / `#4a6070` | `#223a4d` / `#a9b8c4` |
| `--border-strong` | `#8a8170` | `#557290` |
| `--gold` | `#d4af37` (plus `--gold-gradient`) | same |

Also: status tokens (`--status-open`, `-claimed` gold, `-delivered` primary, `-cancelled` muted), sticky-note tokens (`--note-ink`, `--note-stamp`, `--note-badge-foreground`), `--card-glow`, `--hero-glow`, `--scrim`, soft shadows, durations (`120 / 200 / 320 / 900 ms`), `--radius` 0.75rem, `--tap-min` 44px.

**Typography:** Raleway 500–800 for headings (`font-heading`), Geist for body, Geist Mono for code (`src/app/fonts.ts`).

**Layout patterns:** homepage stacked and centered: the `new-bridge.png` illustration, the h1 "Every Connection is a Step Forward.", lead line, two CTAs, How it works (Request, Connect, Provide, Support, Transform), the "Bridging the Gap." artwork, What is The Bridge?, Mission. Cards: 8px corners, `border-primary/45`, `card-glow`. A header 64px tall from 640px up, with a blue bar under the current link; a phone menu below 640px. Glass header (`glass` utility).

**Reusable components:** `Button`, `Card` (variants incl. stat), `Badge`, `StatusBadge`, `CategoryBadge`, `Notice`, `PageHeader`, `SectionHeader`, `EmptyState`, `LoadingState`, `ArchLoader`, `RequestCard`, `RequestDetailLayout`, `StickyNote`, `ImpactStat`, `CtaLink`, `PostNeedButton`, `LangSwitch`, `ThemeToggle`, `VerificationBanner`, `NotFoundView`, `AssistantChat`.

**Signature interactions:**

- `.glow-button`: Sign In, Create my account, Post a Need, View the Needs Board, Claim this need. The reflection appears only on Claim (`.glow-button-reflect`). Adapted from Uiverse.io (ShrinilDhorda).
- `.cta-letters`: the letter-reveal homepage CTAs "Post a need" / "Offer support", with no arrow. Adapted from Uiverse.io (barisdogansutcu).
- Assistant "Send" button: blue, near-black text for contrast, slides right on hover. Adapted from Uiverse.io (EcheverriaJesus).
- Hero rise/fade, the arch draw-on, the arch loader loop, a 2% press-down on buttons, chat bubbles with a tail corner, tooltips after 300 ms (Escape hides them), the EN / ES radio group with a tooltip.
- Every animation has a `prefers-reduced-motion` fallback.

**Accessibility:**

- Touch: 44px targets.
- Contrast: text at least 4.5:1, measured from rendered pixels in tests.
- Keyboard: focus rings, arrow keys in radio groups, Escape closes menus and tooltips, focus returns where it should.
- Structure: one h1 per page, landmarks, named controls, alt text.
- Layout: responsive from 320 to 1440px with no horizontal scroll.
- States: errors are never shown in red alone (decision D4).

**Decisions not to overwrite:** dark theme by default; logo colors as sampled (D2); arch + "B" monogram favicon (D3); no red for errors (D4); branded 404 (D5); the homepage composition and button designs above; sticky-note board; 8px card and panel corners.

## 10. Most recent development context

### Last completed task (committed and pushed)

`8919481 style: chat panel corners and new send button` (2026-10-26):

- **Owner's request:** make the assistant's corners less rounded to match the landing-page cards, and use a Uiverse send-button design.
- **Changes:**
  - `src/components/assistant/assistant-chat.tsx`: the panel uses `rounded-t-[0.5rem] sm:rounded-[0.5rem]`. The icon-only send button is replaced by a "Send" / "Enviar" text button with a paper-plane SVG.
  - `scripts/e2e/panel.mjs`: the suggested-question selector now skips `button[type=submit]`.
- **Deliberate changes from the snippet:**
  - Near-black text instead of white, because white is about 3.7:1 on blue-500. Near-black is 5.3:1 at rest and 7.9:1 on hover.
  - `min-h-tap` (44px height).
  - A real `transition` property (the snippet had only a duration).
  - A focus ring, a disabled state, and reduced motion.
- **Tested:**
  - Clean build, lint.
  - `e2e:panel` 234/234, `e2e:a11y` 115/115, `e2e:spanish` 168/168.
  - Screenshots at 1280px dark and 390px light.
- **Open observation:** on hover at desktop width the button slides to about 4px from the panel's edge. The owner was told and offered a shorter slide; no answer yet.

Earlier in the same stretch:

| Commit | Change |
|---|---|
| `b0806bf` | Project README |
| `de3ee52` | Compact EN / ES toggle with tooltip; reflections and CTA arrows removed |
| `3a0a947` | Spanish "How it works" wording |
| `0b646f7` | Restored homepage CTA labels after a failed Vercel build |
| `98c7dd8` | Letter-reveal CTAs |
| `49f70b3`, `bd869c2` | Glow buttons |
| `5c8b870` | Not-found page without JavaScript |
| `5ead0cc` | Spanish toggle |
| `c03fb9a` / `db43b8d` / `ada22bb` | Needs Board, inbox and tests |

### AI-powered screening of sensitive information in requests

**Status: not implemented and never started.** The code, the git history, and the full development transcript show no screening code, prompt, test, or design for it. The topic appears in the handoff brief for the first time. This is what exists and what doesn't:

| Safeguard | Implemented? | What exists today |
|---|---|---|
| Exact street addresses and building numbers | **No** | Guidance on the form and pledge; no address field anywhere; neighborhood is a fixed dropdown |
| Apartment, suite, floor, or unit numbers | **No** | Same guidance only |
| GPS coordinates and precise map locations | **No** | No location fields; guidance only |
| Where identifiable people sleep, shelter, or gather | **No** | Guidance on the form and pledge; the assistant's prompt refuses such details **in chat only** |

The existing AI API is used **only** by the chat assistant; it never sees request text. Screening would reuse the same SDK and key with no new dependency. The proposed design, the decisions the owner must make (fail open vs. closed, block vs. warn, the privacy notice), and the tests to write are in [DEVELOPMENT_ROADMAP.md §1](DEVELOPMENT_ROADMAP.md#1-ai-screening-of-request-text-for-sensitive-details).

### Decisions already agreed (still in force)

- Reflections were removed from the glow buttons except on Claim; the CTA arrows were removed; the gap between the CTAs was widened.
- The 10-question assistant limit stays.
- The zod advisory is deferred until the auth package upgrade.
- The two deleted images are never included in commits unless the owner says so.
- Production migrations are run only by the owner.

### Exact next step

There is no half-finished code task. The next steps, in order:

1. Owner reviews these handoff documents.
2. Owner decides whether to commit them, and what to do with the two deleted images.
3. Owner decides whether to start AI screening (roadmap §1) and answers its design questions.
4. Confirm live sign-in on production (roadmap §2).

## 11. Verification results (2026-10-27)

No fresh verification results were recorded for this handoff. Historical results are in
`docs/test-results.md` and `docs/assistant-tests.md`; no tests were run for this document update.

## 12. Git and repository state

At the time of writing:

- **Branch:** `main`, in sync with `origin/main` (nothing ahead or behind).
- **Latest commit:** `8919481 style: chat panel corners and new send button` (2026-10-26).
- **Uncommitted changes:**
  - `public/images/needs-card-post-board.png` and `public/images/sticky-note.png` are **deleted** in the working tree, not staged. The owner deleted them; no code references them, and earlier sessions deliberately kept them out of commits. They can be restored with `git restore` if wanted.
  - The four new handoff documents in `docs/` are **untracked**.
- **Untracked files besides the handoff docs:** none. `.env.local`, `.env.prod.local`, `test-results/`, `.next/`, and `*.tsbuildinfo` exist but are git-ignored.
- **Stashes:** none. **Other branches:** none in use. **Merge conflicts:** none possible right now (no divergence from origin).
- **Nothing was committed, pushed, reset, or discarded during this handoff.**

## 13. Risks

| Risk | Detail |
|---|---|
| Sensitive details in free text | No automated screening yet (roadmap §1). |
| Neon Auth beta | `@neondatabase/auth` 0.7.0-beta; a pending upgrade also fixes the bundled zod advisory. |
| Production sign-in unverified | The trusted domain is set, but no live sign-in check is recorded. |
| Rate limit per instance | The assistant's limits aren't global on Vercel. |
| Next.js 16 differences | APIs differ from older versions; read `node_modules/next/dist/docs/` first. |
| Stale build cache | Can hide type errors locally; always clean-build before committing. |
| Port 3100 | A server left running from an earlier session served an old build during this handoff. Check that nothing else holds the port before running browser tests. |
| Unreviewed Spanish | 19 Spanish strings await review, including legal and privacy wording. |
| Tests mutate dev data | e2e and `test:claims` reseed or write to `the-bridge-dev` (guarded; never production). |

## 14. Development rules for Codex

1. Preserve existing working functionality; run the relevant tests before and after a change.
2. Never overwrite or remove completed features without a clear reason the owner has agreed to.
3. Make small, focused, reviewable changes, one concern per commit.
4. Explain important technical decisions, with the alternative you didn't choose.
5. Use the existing patterns:
   - rules in `request-rules.ts`;
   - copy in `copy.ts` in both languages;
   - tokens in `globals.css`;
   - validation in `validation.ts`;
   - test scripts in `scripts/`.
6. Follow the established UI/UX and branding (§9 and `design-system.md`), including 44px targets, measured contrast, and reduced motion.
7. Put user privacy and security first (`AI_CONTEXT.md` §2).
8. Never expose secrets: not in code, logs, output, commits, or messages. Report only whether a secret is set and its length.
9. Use Drizzle migrations for every schema change. Show the SQL first, apply to development only, and give the owner the production command.
10. Test changes before declaring them complete: lint, `tsc`, clean build, the affected `test:*` and `e2e:*`.
11. Report errors and limitations honestly, including failing tests and anything skipped.
12. Ask before:
    - major architectural changes;
    - new dependencies;
    - Vercel changes;
    - destructive SQL;
    - commits and pushes.

---

## FIRST PROMPT TO SEND TO CODEX

```text
You are taking over development of The Bridge, a Next.js 16 + Neon Postgres app in this
repository, from Claude Code. Do not change any code yet.

1. Read, in this order: docs/AI_CONTEXT.md, docs/CODEX_HANDOFF.md, docs/FEATURE_STATUS.md,
   docs/DEVELOPMENT_ROADMAP.md, README.md, AGENTS.md, and docs/design-system.md.
   The rules in AI_CONTEXT.md (privacy, secrets, migrations, no commits without approval)
   apply to everything you do.
2. Inspect the repository: git status, git log -15, the structure of src/, drizzle/, and
   scripts/, and src/db/schema.ts, src/lib/request-rules.ts, src/proxy.ts, and
   src/app/api/chat/route.ts.
3. Verify the actual state without changing anything: npm run lint, npx tsc --noEmit, and a
   clean production build (delete .next, then npm run build). Report the results exactly.
   Do not run db:migrate:prod, admin:grant:prod, or anything that touches production. Do
   not print any secret value; if you check an environment variable, report only whether
   it is set and its length.
4. Tell me where Claude Code stopped: the last commit, the uncommitted changes, and the
   exact next step recorded in the handoff.
5. Explain in your own words what the app does, how it is built, and its privacy rules.
   Point out anything in the docs that does not match the code.
6. Give me a prioritized plan for continuing development, starting with the roadmap's
   housekeeping and the AI screening of sensitive details in request text (which is NOT
   built yet), including the decisions you need from me.
7. Then stop and wait for my approval before making any implementation change, commit, or
   push.
```
