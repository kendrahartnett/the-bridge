# Development roadmap

Prioritized remaining work for The Bridge, as of commit `8919481` (2026-10-27). Nothing here is approved for implementation yet: each item needs the owner's go-ahead, and items marked **Decision** need the owner to choose first.

The handoff-document and design-system housekeeping is complete. Privacy screening is implemented locally and described in section 1. Production checks remain next; the existing Spanish copy review in section 3 is complete.

Rules that apply to every item are in [AI_CONTEXT.md §3](AI_CONTEXT.md#3-security-and-operations-rules-from-the-owner). In short: small focused changes, no new dependencies or Vercel changes without asking, migrations shown first and applied to development only, tests and a clean build before declaring anything done.

---

## 0. Housekeeping (small, do first)

| Task | Detail | Needs |
|---|---|---|
| Remove two unused images | `public/images/needs-card-post-board.png` and `public/images/sticky-note.png` have no code references; the board uses `sticky-note-card.png`. | Approved for inclusion in the privacy workflow commit. |
| Handoff docs | Committed locally as `d9c6c86`; not pushed. | Owner approval before pushing. |
| Point Codex at the docs from `AGENTS.md` | Codex reads `AGENTS.md` automatically. The file holds only the block `next dev` manages (between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`). Text added **outside** the markers is preserved; inside them it is regenerated. A short section after the END marker linking to `docs/AI_CONTEXT.md` would make the rules load in every Codex session. | Owner approval (it changes an instruction file). |
| Refresh stale notes in `docs/design-system.md` | The phase status and `RequestDetailLayout` route were corrected in `e26c235`. | Complete. |

## 1. AI screening and admin privacy review — implemented locally

The server now blocks high-risk submissions, sends medium-risk submissions to a private admin queue as separately screened safe drafts, and publishes low-risk submissions. A screening outage does not publish or queue. Admin approval screens the exact safe candidate again. Successful resubmissions preserve the prior review as non-actionable history and link replacement reviews. Migrations `0007` and `0008` were applied to the development database only; production is unchanged.

**Before deployment:** review the new English and Spanish privacy notice and plan the production migration with the owner. Targeted synthetic live Anthropic checks passed locally; the full browser suites have not run. Automated classification can miss or over-flag details; monitor safe diagnostic codes without logging submitted text. The generated Drizzle snapshot and mocked rule tests are in the repository.
## 2. Production checks

| Task | Detail |
|---|---|
| Confirm live sign-in works | Production sign-in and sign-up failed with `INVALID_ORIGIN` because Neon Auth's trusted-domain list was empty. As of 2026-10-27 the production branch lists `https://the-bridge-one.vercel.app`, but no record shows a live sign-in test after that. The owner (or an agent with approval) should sign in on the live site with a real account. If the site gets a custom domain, it must be added to the list too. |
| zod advisory in `@neondatabase/auth` | High severity, deferred on 2026-10-24 "together with the production sign-in fix". Needs a newer `@neondatabase/auth` (semver-major). **Ask before upgrading**, run the full suite after, and update `docs/security-notes.md`. |
| Confirm production migrations are current | Production has not received migrations `0007` and `0008` for privacy review and resubmission history. Only the owner runs `npm run db:migrate:prod -- --confirm` after reviewing the final SQL and deployment plan. |

## 3. Spanish review — complete

The existing Spanish copy was reviewed and verified by two fluent Spanish speakers. The new screening and admin review strings were added afterward and need owner review before deployment.

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
