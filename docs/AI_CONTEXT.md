# AI context: what any AI agent working on The Bridge must preserve

Read this before changing anything. It is the short list of things that are easy to break and expensive to get wrong. The full project picture is in [CODEX_HANDOFF.md](CODEX_HANDOFF.md).

Last reviewed: 2026-10-27, at commit `8919481`.

---

## 1. Mission and who uses the app

The Bridge is a Chicago web app that connects **outreach workers and community members** (who post needs) with **local organizations** (who claim and supply them) to support people experiencing homelessness.

Mission statement (exact wording lives in `src/lib/copy.ts`, `MISSION`):

> Bridging the gap between people experiencing homelessness and the community organizations ready to help.

- **People experiencing homelessness do not use the app.** Never write copy, prompts, or features that describe them as users. The assistant's prompt states this explicitly with a right/wrong example.
- Today the app covers **essential resources only**: food, clothing, hygiene supplies, and other items. Medical care, documents, benefits, addiction and mental health support, employment, education, and housing are **planned, not built**. The assistant is told to say so and point people to 211.
- Live site: https://the-bridge-one.vercel.app (deployed from `main` on Vercel).

## 2. Privacy rules (non-negotiable)

These rules are the reason the product exists in its current shape. Do not weaken them without the owner's explicit, written approval.

1. **Nothing identifying about the people being served is ever stored.** No columns for names, addresses, camp locations, GPS coordinates, or identifying details. Location is the **Chicago community area only** (a fixed list in `src/lib/neighborhoods.ts`, enforced by a database CHECK constraint). The rule is written at the top of `src/db/schema.ts`.
2. **Free text is the remaining risk.** A need's `items` (≤200 chars) and `dietary_notes` (≤300 chars) are free text written by the poster and shown to organizations. Today they are protected only by on-screen guidance, the sign-up pledge, and length limits. **There is no automated screening of this text yet** (see section 6).
3. **Contact emails** are shared only between the poster and the organization that claimed the need, only after the claim, and only while that organization is approved. This is decided **in the database queries** (`src/lib/request-rules.ts`), so a hidden email never reaches the browser.
4. **Restricted pages answer with a real 404.** The Needs Board, need pages, and admin answer anyone not allowed to see them with the same not-found page and HTTP 404, so they don't reveal that they (or a given need) exist. This happens in `src/proxy.ts` and again in each page.
5. **Notifications store no free text.** The inbox text is built at render time from the need and the accounts; admin review notes are never shown to organizations.
6. **The assistant has no data access.** It cannot see accounts, requests, or the database, stores nothing on the server, and message text is never logged.
7. **Privacy notice wording is exact.** The privacy notice on Post a Need (`NEW_REQUEST_COPY.privacy` in `copy.ts`) must match what is actually stored. If the schema changes, the notice must change with it, and the owner must approve the wording.

## 3. Security and operations rules from the owner

These were given as standing instructions during development. They apply to every agent.

- **Never commit secrets.** Only `.env.example` (no values) is committed. `.env.local` and `.env.prod.local` are git-ignored.
- **Never print, log, or echo secret values**: connection strings, passwords, API keys, full database URLs, even in error output. To confirm a secret exists, report only that it is set and its length. Scripts filter their output through `src/lib/redact.ts` (`installRedaction()`); new scripts must do the same.
- **Report Neon project names only**, never connection strings or keys.
- **Do not change Vercel settings yourself.** Tell the owner what to change.
- **Ask before adding any new dependency.**
- **Never run destructive SQL or deletes without explicit approval.**
- **If something fails, stop and explain the error and your proposed fix before continuing.**
- **Never use the database connection string in client code.** `DATABASE_URL` is server-only; nothing is `NEXT_PUBLIC_`.
- **Permission checks go in `src/lib/request-rules.ts` or server queries, never only in the UI.**
- **Migrations:** show the SQL first, apply to the development database (`npm run db:migrate`), and only after the owner approves, tell them the exact production command (`npm run db:migrate:prod -- --confirm`). **Never apply migrations to production yourself.**
- **Commit and push only when the owner asks.** Branch first if not working on `main` by agreement.
- Two databases, never mixed: Neon project **`the-bridge-dev`** (development, tests, seeding) and **`the-bridge`** (production). Seeding and every test refuse to run against anything but `the-bridge-dev` (`src/db/dev-guard.ts`).

## 4. Data handling at a glance

| Data | Where | Who can see it |
|---|---|---|
| Account email, display name | `users` | The account itself; the other side of a claim (email only) |
| Organization name, website, EIN, contact name | `users` | The organization; admins |
| Admin review note | `users.review_note` | Admins only, never the organization |
| Need: category, items, people count, notes, neighborhood, time window, status | `food_requests` | Poster; approved organizations (board); viewers allowed by `getRequestForViewer` |
| Inbox events | `notifications` (type + ids only) | The recipient only |
| Passwords and sessions | Neon Auth (managed) | Never stored or logged by the app |
| Assistant conversations | The visitor's browser only | Sent to Anthropic per request; not stored or logged by the app |

## 5. Brand and experience to preserve

The visual identity is settled. Do not change it unless the owner asks. Full detail: [docs/design-system.md](design-system.md) and [CODEX_HANDOFF.md §9](CODEX_HANDOFF.md#9-uiux-and-branding).

- **Look:** warm ivory and deep navy in light mode; slate-950 night with soft blue in dark mode (dark is the default). Metallic **gold** is the accent (the arch, the "Claimed" stamp). The golden **arch/bridge** is the brand motif.
- **Type:** Raleway (600–800) for headings via `font-heading`; Geist for body.
- **Tone:** plain, warm, respectful. Needs are described, people are not. Copy uses "outreach workers and community members" and "organizations".
- **Colors only through tokens** in `src/app/globals.css` (`--primary`, `--gold`, `--surface`, `--note-*`, status tokens). No raw hex in components.
- **No red for errors** (decision D4): errors use strong text, a border, and an icon.
- **Cards** on the homepage and sign-in: 8px corners, blue border, soft glow (`card-glow`). The assistant panel also uses 8px corners.
- **Buttons:** `.glow-button` (Sign In, Create my account, Post a Need, View the Needs Board, Claim this need; reflection only on Claim via `.glow-button-reflect`) and `.cta-letters` letter-reveal for the two homepage CTAs. Both are adapted from Uiverse.io and credited in the README.
- **Needs Board:** sticky-note cards (`sticky-note-card.png`), slight tilt, a "Claimed" stamp.
- **Accessibility is part of the brand:** 44px tap targets (`min-h-tap`), text contrast of at least 4.5:1 measured from real pixels, visible focus rings, `prefers-reduced-motion` respected everywhere, responsive down to 320px, everything usable by keyboard and screen reader.
- **Bilingual:** every visible string lives in `src/lib/copy.ts` in English and Spanish. A new string needs both. The existing Spanish copy was reviewed and verified by two fluent Spanish speakers.

## 6. AI usage in the app (current truth)

| Use | Status |
|---|---|
| **The Bridge assistant** (chat panel on every page) | **Built, tested, live.** `src/app/api/chat/route.ts`, model `claude-haiku-5-5` via `@anthropic-ai/sdk`, prompt in `src/lib/assistant-prompt.ts`. |
| **AI screening of request text for sensitive details** (addresses, unit numbers, GPS coordinates, descriptions of where people sleep or shelter) | **Not built and not started.** No code, no tests, no prompt exists. Requested in the handoff brief of 2026-10-27; a proposed design is in [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md). Needs the owner's approval before any work. |

Never describe the screening as existing, in code comments, copy, the assistant prompt, or docs, until it is built and tested.

## 7. Architectural constraints

- **Next.js 16.4.3 is newer than most training data.** `AGENTS.md` (managed by `next dev`) says to read `node_modules/next/dist/docs/` before writing Next.js code. Notable differences used here: `proxy.ts` (formerly `middleware.ts`), `cacheComponents`, root params (`next/root-params`), `experimental.globalNotFound`.
- **Every page lives under `src/app/[lang]/`** (en and es). The proxy rewrites each request to `/en/…` or `/es/…` from the `lang` cookie; addresses never show the language.
- **Server actions call the rule functions** in `src/lib/request-rules.ts`; each state change and its notification are written in a single SQL statement (CTE), so they can't diverge.
- **Validation is shared** (`src/lib/validation.ts`, zod) between browser and server; the server's check is the real one.
- **Migrations come from Drizzle** (`npm run db:generate`), never hand-edited after they are applied.
- **Before committing, run a clean build** (`rm -rf .next && npm run build`): a cached type check once hid an error that failed the Vercel deploy.
