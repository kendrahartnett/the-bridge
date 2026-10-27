# Development roadmap

Prioritized remaining work for The Bridge, as of commit `8919481` (2026-10-27). Nothing here is approved for implementation yet: each item needs the owner's go-ahead, and items marked **Decision** need the owner to choose first.

Order of work: **0 (housekeeping)** → **1 (privacy screening)** → **2 (production checks)** → **3 (Spanish review)**, then the product items in 4–9 in whatever order the owner prefers.

Rules that apply to every item are in [AI_CONTEXT.md §3](AI_CONTEXT.md#3-security-and-operations-rules-from-the-owner). In short: small focused changes, no new dependencies or Vercel changes without asking, migrations shown first and applied to development only, tests and a clean build before declaring anything done.

---

## 0. Housekeeping (small, do first)

| Task | Detail | Needs |
|---|---|---|
| Decide on two deleted images | `public/images/needs-card-post-board.png` and `public/images/sticky-note.png` are deleted in the working tree but not committed. No code references them (the board uses `sticky-note-card.png`). | **Decision:** commit the deletion or restore them (`git restore public/images/…`). Previous sessions deliberately left them out of every commit. |
| Commit the handoff docs | `docs/CODEX_HANDOFF.md`, `FEATURE_STATUS.md`, `DEVELOPMENT_ROADMAP.md`, `AI_CONTEXT.md` are new and uncommitted. | Owner approval to commit and push. |
| Point Codex at the docs from `AGENTS.md` | Codex reads `AGENTS.md` automatically. The file holds only the block `next dev` manages (between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`). Text added **outside** the markers is preserved; inside them it is regenerated. A short section after the END marker linking to `docs/AI_CONTEXT.md` would make the rules load in every Codex session. | Owner approval (it changes an instruction file). |
| Refresh stale notes in `docs/design-system.md` | §9 says `RequestDetailLayout` is "not routed yet"; it is now used by `/requests/[id]`. Phase 8 ("application-wide QA") has no recorded completion, although the e2e suites now cover that ground. | Documentation only. |

## 1. AI screening of request text for sensitive details

**Status:** not started (no code, prompt, or tests exist). **Priority:** highest, because the two free-text fields are the one place identifying location details can still enter the database and reach organizations.

**Goal:** when someone posts a need, detect and stop (or flag) text in `items` and `dietary_notes` that contains:

1. exact street addresses and building numbers;
2. apartment, suite, floor, or unit numbers;
3. GPS coordinates and precise map locations (including map links and plus codes);
4. descriptions of where identifiable people sleep, shelter, or gather in vulnerable circumstances ("the tent behind the blue dumpster at …", "under the viaduct at 47th and …").

**Proposed design (for the owner to approve or change):**

- **Where it runs:** on the server, inside `createRequest` in `src/lib/request-rules.ts`, after zod validation and before the INSERT. Nothing in the browser decides it (rule: permission and policy checks live in the rules file).
- **Two layers:**
  1. **Deterministic check first** (no network, instant, testable): patterns for coordinates (`41.88, -87.63`, degrees/minutes), map links (`maps.google`, `goo.gl/maps`, `maps.apple`, plus codes), unit markers (`apt`, `unit`, `suite`, `#4B`, `floor`, `piso`, `depto`), and house-number-plus-street-suffix (`1234 N Clark St`, `Ave`, `Blvd`, `calle`). Catches the clear cases, including when the AI is unavailable.
  2. **AI check second**, for what patterns can't judge (category 4, intersections, landmarks). Reuse the existing `@anthropic-ai/sdk` client and key; a short server-only classification prompt; structured JSON output (`{ flagged: boolean, categories: [...] }`); the same timeout and no-retry pattern as the chat route; thinking disabled; never log the text.
- **What the person sees:** the form stays filled in, the field is marked, and a message in their language explains which kind of detail to remove ("Remove the street address. Only the neighborhood is shared."). Nothing is saved until the text passes.
- **Decisions the owner must make:**
  - **AI unavailable or times out:** *fail closed* (block posting and say "try again") or *fail open* (save with only the deterministic check). Recommendation: fail open after the deterministic check, so outreach workers are never blocked from getting help to people, and log only that the check was skipped (no text).
  - **Block or warn:** hard block, or "post anyway" for false positives. Recommendation: block for categories 1–3 (clear-cut), allow an explicit override for category 4 only if false positives turn out to be common.
  - **Model:** `claude-haiku-5-5` (as the assistant) is the cheap, fast default.
  - **Existing data:** whether to scan needs already in production (read-only report first).
  - **Privacy notice:** sending need text to Anthropic for screening is a new data flow. The privacy notice wording (exact, owner-approved) may need to mention it.
- **Copy:** new strings in `copy.ts` in English and Spanish (Spanish marked `// needs review`).
- **Tests to add:**
  - A unit script (`scripts/test-sensitive-screen.ts`, `npm run test:screen`) for the deterministic layer: positive and negative cases in English and Spanish, including tricky negatives ("2 boxes of size 10 shoes", "500 calories", "twin-size blankets for 4") and Chicago address shapes.
  - A labelled set of example texts for the AI layer, run on demand only (it costs money; get approval first), reporting precision and recall per category.
  - `test:claims`: a flagged post is not inserted; a clean one is.
  - `e2e:form`: the error appears on the right field, in both languages, with contrast and focus handled.
- **No schema change** is needed unless the owner wants to store a "screened" flag. **No new dependency** is needed.

## 2. Production checks

| Task | Detail |
|---|---|
| Confirm live sign-in works | Production sign-in and sign-up failed with `INVALID_ORIGIN` because Neon Auth's trusted-domain list was empty. As of 2026-10-27 the production branch lists `https://the-bridge-one.vercel.app`, but no record shows a live sign-in test after that. The owner (or an agent with approval) should sign in on the live site with a real account. If the site gets a custom domain, it must be added to the list too. |
| zod advisory in `@neondatabase/auth` | High severity, deferred on 2026-10-24 "together with the production sign-in fix". Needs a newer `@neondatabase/auth` (semver-major). **Ask before upgrading**, run the full suite after, and update `docs/security-notes.md`. |
| Confirm production migrations are current | Production should have all 7 migrations (`0000`–`0006`). Only the owner runs `npm run db:migrate:prod -- --confirm`; its summary line says how many are recorded. |

## 3. Spanish review

19 strings in `src/lib/copy.ts` are marked `// needs review`: the AI disclosure, sign-up pledge, privacy notice, contact and handoff guidance, and other legal or sensitive wording. A native Spanish speaker should review them; then remove the markers. Run `npm run e2e:spanish` after any change.

## 4. Notifications beyond the app

Email alerts for claims and fulfilments, and for admins when an organization applies. **Needs:** an email provider (new dependency and new environment variables, so ask first), an opt-out, and a decision on what an email may contain (never details of the people being served). Builds on the existing `notifications` table.

## 5. Needs Board filters

Filter by category, neighborhood, and status; keep the sticky-note design. No schema change. Tests: extend `e2e:board` (layout at 320px, keyboard, both themes and languages).

## 6. Delivery workflow improvements

- The organization confirms receipt (or handoff), alongside the poster's "Fulfilled".
- An optional completion note (privacy rules apply: describe the delivery, never the people).
- Phone and text contact options on posts.

Each needs a migration (show SQL first, development only), rule changes in `request-rules.ts` with `test:claims` coverage, and privacy notice review.

## 7. Automated organization checks

EIN lookup and website checks to help (not replace) admin review. Likely an outside API (ask first).

## 8. Neighborhood map

Needs shown by community area, never by exact location. Probably a new dependency (ask first); must meet the same contrast, keyboard, and reduced-motion standards.

## 9. Platform hardening

- A shared store for the assistant's rate limit (today it is per server instance on Vercel).
- Real-time or periodic refresh for the board and inbox.
- Decide on `@neondatabase/auth` leaving beta.
- Add a license (README says "to be added by the author").

---

## Testing requirements for any change

1. `npm run lint` and `npx tsc --noEmit`.
2. A **clean** build: `rm -rf .next && npm run build`.
3. Rule tests that touch the change: `npm run test:claims` (development database), and the other `test:*` scripts as relevant.
4. Browser tests: start `npx next start -p 3100` from the new build (make sure nothing else holds port 3100), then the affected `npm run e2e:<suite>` or the full `npm run e2e`. For copy or layout changes, also run with `-- --lang=es`.
5. Report actual results, including failures. Never edit a test only to make it pass without saying why the old check was wrong.
