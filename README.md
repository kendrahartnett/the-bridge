# The Bridge

A Chicago platform that connects outreach workers and community members who need essential resources (food, clothing, hygiene supplies, and other items) with local organizations ready to help, with privacy and dignity at the center.

**Live site:** https://the-bridge-one.vercel.app

## Mission

Bridging the gap between people experiencing homelessness and the community organizations ready to help. The Bridge starts with essential resources and outreach, builds trust through consistent contact, and grows toward the services people need to find stability: medical care, documents, benefits, addiction and mental health support, employment, education, and housing. People experiencing homelessness don't use the app themselves; the outreach workers and community members who support them post what's needed, and organizations respond.

## Features

| Feature | What it does |
|---|---|
| Post a Need | Outreach workers and community members describe what's needed: the type of support, the items, how many people, the neighborhood, notes, and a time window. |
| Organization accounts | Organizations sign up with their name, website, an optional EIN, and a contact. A person reviews each one before it can claim needs or see contact information. |
| Needs Board and need pages | Organizations browse open and in-progress needs as sticky notes (`/board`); each need has its own page with a status timeline (`/requests/[id]`). |
| Claim, fulfil, cancel | An approved organization claims a need; the poster marks it fulfilled or cancels it while it's open. The rules are enforced on the server and in the database, including when two organizations claim at the same moment. |
| Inbox | Notifications for claims, completed needs, and account approvals, on the dashboard and behind a bell in the header. |
| Admin review | Admins review organization applications, approve, reject, or revoke, with an internal note (`/admin`). |
| AI assistant | A chat assistant that explains how The Bridge works, with guardrails (see below). |
| English and Spanish | An EN / ES switch in the header; the choice is saved in a `lang` cookie and the page renders on the server in that language. |
| Light and dark themes | A theme toggle in the header (dark by default). |
| Accessibility | Responsive down to 320px, keyboard and screen-reader support, 44px tap targets, contrast checked from real pixels, reduced motion respected. |

The existing Spanish copy was reviewed and verified by two fluent Spanish speakers.

## Tech stack

- **Next.js** (App Router, Cache Components), **React**, **TypeScript**
- **Tailwind CSS**, **shadcn/ui** (Radix UI), **Motion**
- **PostgreSQL on Neon**, with **Drizzle ORM** and Drizzle Kit migrations
- **Neon Auth** for sign-in
- **Anthropic API** (Claude Haiku) for the assistant
- **Vercel** for hosting

## Privacy and safety design

- **What's stored about a need:** the Chicago community area (a neighborhood, not an address), the number of people, the type of support, the items needed, optional notes, and a time window.
- **What's never stored:** names, addresses, or exact locations of the people being served. The forms ask for none of these, and the database schema has no fields for them.
- **Contact information** (account emails) is shared only between the person who posted a need and the organization that claimed it, only after the claim, and only while that organization is approved. Which emails a page may show is decided in the database queries, so a hidden email is never sent to the browser.
- **Pages only some accounts may see** (the Needs Board, need pages, admin) answer everyone else with the same not-found page and a real 404, so they don't reveal that they exist.
- **Passwords** are handled by the managed auth service (Neon Auth), which stores them hashed; the app never stores or logs them.
- **The assistant** has no access to accounts, requests, or the database, and never sends email. It is told not to ask for or repeat names, locations, or health details, to point people to 988 or 211 when needed, and not to give medical, legal, or financial advice.
- **Secrets** are kept out of the repository (only `.env.example`, without values, is committed) and out of logs: every script filters its output through `src/lib/redact.ts`.

## Getting started (local development)

### Prerequisites

- **Node.js 22.18 or later** (the repo's scripts run TypeScript files directly with Node; development uses Node 24). The repo doesn't pin a version in `package.json` or `.nvmrc`.
- **npm**
- **A Neon account**, with a development project (this repo's is named `the-bridge-dev`) that has Neon Auth enabled.

### Install

```sh
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Never commit `.env.local` or `.env.prod.local`.

| Variable | What it does | Local development | Production |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection string for the Neon database | Required (the development project) | Required (set in Vercel) |
| `NEON_AUTH_BASE_URL` | The Neon Auth endpoint for sign-in | Required | Required |
| `NEON_AUTH_COOKIE_SECRET` | Signs the session cookies (at least 32 characters) | Required | Required |
| `ANTHROPIC_API_KEY` | The assistant's API key; without it, the assistant answers with a fixed fallback message | Optional | Required for the assistant |
| `ADMIN_CONTACT_EMAIL` | The address shown to organizations under review or not approved (banners, inbox, assistant) | Optional | Recommended |
| `SEED_TEST_PASSWORD` | The password for the seeded test accounts, used by `db:seed` and the browser tests | Required for seeding and tests | Not used |
| `E2E_BASE_URL` | The local server the browser tests use (default `http://localhost:3100`) | Optional | Not used |
| `CHROME_PATH` | Where the browser tests find Chrome, if not in its usual place | Optional | Not used |

`.env.example` lists the first four. Production's database URL also lives in `.env.prod.local` (never committed), which only `db:migrate:prod` and `admin:grant:prod` read. Don't name it `.env.production.local`: Next.js loads that file automatically in production mode and it would override `.env.local`.

### Database

```sh
npm run db:migrate   # apply the migrations in drizzle/ to the database in .env.local
npm run db:seed      # create or reset the test accounts and test needs (development only)
```

The seed creates fictional accounts (for example `test.outreach1@example.com`, `test.donor1@example.com`, and the admin `test.admin@example.com`), all with the password in `SEED_TEST_PASSWORD`. It refuses to run against anything but the development project (`src/db/dev-guard.ts`).

### Run

```sh
npm run dev
```

Then open http://localhost:3000.

## Scripts

"Database" says which database a script touches; "development only" scripts check first and refuse any other database.

| Script | What it does | Database |
|---|---|---|
| `dev` | Starts the development server at http://localhost:3000 | Reads the database in `.env.local` |
| `build` | Builds the app for production | None |
| `start` | Serves the production build | Reads the database in `.env.local` |
| `lint` | Runs ESLint | None |
| `db:generate` | Creates a new migration in `drizzle/` from changes to `src/db/schema.ts` | None |
| `db:migrate` | Applies pending migrations | Writes to the database in `.env.local` |
| `db:seed` | Creates or resets the test accounts, needs, and notifications | Development only |
| `test:claims` | Tests the request, verification, and inbox rules (see Testing) | Development only; deletes only the rows it created |
| `test:assistant-reply` | Tests how assistant replies are cleaned up | None |
| `test:redact` | Tests that scripts never print secrets | None |
| `test:migrate-summary` | Tests the production migration script's summary, against development | Development only |
| `admin:grant` | Makes an existing account an admin: `npm run admin:grant -- <email>` | Writes to the database in `.env.local` |
| `admin:grant:prod` | **Production.** The same on production; reads `.env.prod.local` and changes nothing unless you type `yes` | **Production** |
| `db:migrate:prod` | **Production.** Applies migrations to production; runs only with `-- --confirm` | **Production** |
| `e2e` | Runs every browser test suite | Development only; reseeds |
| `e2e:<suite>` | Runs one browser test suite (see Testing) | Development only; reseeds |

## Testing

### Rule and unit tests

```sh
npm run test:claims            # request, verification and inbox rules (development database)
npm run test:assistant-reply   # assistant reply clean-up
npm run test:redact            # secrets never appear in script output
npm run test:migrate-summary   # the production migration script's summary (development database)
```

`test:claims` calls the same rule functions as the app (`src/lib/request-rules.ts`) with the seeded accounts. It covers claiming, fulfilling, and cancelling; organization approval, rejection, and revocation; which emails each side can see; the Needs Board and need-page visibility; that each change creates exactly one notification (including a race of two organizations claiming at once, 10 times); and that people can read only their own notifications. It deletes only the rows it created and writes its results to [docs/test-results.md](docs/test-results.md).

### Browser tests

The suites in `scripts/e2e/` drive headless Chrome against a local production build. They run only against the development database and a localhost server: they refuse anything else, and reseed the test data before and after each suite. They need Chrome installed (or `CHROME_PATH`).

```sh
npm run build
npx next start -p 3100   # in another terminal
npm run e2e              # every suite, or one: npm run e2e:board
```

| Suite | Covers |
|---|---|
| `e2e:responsive` | Layout of the main pages at phone to desktop widths |
| `e2e:dashboards` | Sign-in forms and the pending, rejected, and approved organization dashboards |
| `e2e:admin` | The admin review page, its tabs and confirmations |
| `e2e:contact` | Who sees which contact email, before and after a claim |
| `e2e:nav` | Header links, phone menu, language switch, focus, 44px targets |
| `e2e:verification` | Admin access (a real 404 for others), approving and revoking |
| `e2e:form` | The Post a Need privacy notice and layout |
| `e2e:dropdown` | Post a Need dropdown colors and contrast |
| `e2e:panel` | The assistant panel: layout, keyboard, contrast, limits |
| `e2e:notices` | Contrast of the account-status banners and notices |
| `e2e:homepage` | The homepage hero, images, buttons, and reduced motion |
| `e2e:signin` | The sign-in page, tabs, account types, and errors |
| `e2e:a11y` | Every page for each kind of account: contrast, headings, landmarks, names, no overflow |
| `e2e:board` | Needs Board and need-page access for every account, the sticky notes, the inbox |
| `e2e:spanish` | The language switch and cookie, Spanish pages with no English left, Spanish layout |
| `e2e:not-found` | The not-found page with JavaScript off, in both languages |

Add `-- --lang=es` to run a suite with the Spanish cookie. More options are in [scripts/e2e/README.md](scripts/e2e/README.md).

### Reports

- [docs/test-results.md](docs/test-results.md): the latest `test:claims` results
- [docs/assistant-tests.md](docs/assistant-tests.md): assistant conversation tests
- [docs/responsive-audit.md](docs/responsive-audit.md): the responsive layout audit
- [docs/design-system.md](docs/design-system.md): the design system and its decisions
- [docs/security-notes.md](docs/security-notes.md): reviewed security advisories

## Project structure

```
src/
  app/          Pages (under [lang]/, one set per language), API routes, global styles
  components/   Shared components (header, request cards, sticky notes, assistant, ui/)
  lib/          Rules, copy, language, validation, auth helpers
  db/           Database schema, connection, seed, and the development-only guard
  proxy.ts      Picks the language and protects pages before they render
drizzle/        SQL migrations and their snapshots
scripts/        Test scripts, admin and production scripts; e2e/ holds the browser tests
docs/           Test results, audits, design system, security notes
public/         Images and brand assets
design/source/  The original logo artwork
```

- **The rules:** `src/lib/request-rules.ts` holds every permission check (who can post, claim, fulfil, cancel, review, and see what). Pages call these functions; they're never enforced in the interface alone.
- **The assistant's instructions:** `src/lib/assistant-prompt.ts`, with its settings in `src/lib/assistant-config.ts`.
- **The copy:** `src/lib/copy.ts` holds every string people see, in English and Spanish.

## Deployment

- **Hosting:** pushes to the `main` branch deploy to Vercel.
- **Environment variables in production** (names only): `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ANTHROPIC_API_KEY`, `ADMIN_CONTACT_EMAIL`.
- **Separate databases:** production and development are separate Neon projects (`the-bridge` and `the-bridge-dev`), each with its own Neon Auth, so accounts and sessions never cross between them.
- **Migrations:** test a migration on development first (`npm run db:migrate`), then apply it to production:

  ```sh
  npm run db:migrate:prod -- --confirm
  ```

  It reads production's database URL from `.env.prod.local`, refuses to run without `--confirm`, and ends with a summary, for example `Applied 2 migrations: 0005_request_status_times, 0006_notifications.` or `Applied 0 migrations; 7 already recorded.`, followed by the total number recorded.

## Known limitations

- **Rate limits are per server instance:** the assistant allows 20 questions per IP per hour, counted in each server instance's memory, so on Vercel it isn't exact across the whole site.
- **Neon Auth is in beta** (`@neondatabase/auth` 0.7.0-beta).
- **No real-time updates:** notifications and the Needs Board update when the page loads.
- **The assistant's 10-question limit resets** when the page is refreshed.
- **The theme needs JavaScript:** without it, pages show the light theme.
- **No text messages or email alerts yet.**
- **Organization verification is manual,** so approval depends on an admin reviewing applications.
- **No maps or location-based features yet.**
- **The illustrations are AI-generated** and illustrative; they don't show real people or events.

## Roadmap

- Phone and text contact options on posts, and a completion note.
- Email alerts for new organization applications and claims.
- Automated EIN verification.
- A neighborhood map showing needs by area, without exact locations.
- Filters on the Needs Board.
- A step where the organization confirms receipt.

## Contributing and feedback

To report a problem or suggest an improvement, open an issue at https://github.com/kendrahartnett/the-bridge/issues. Please don't include anyone's personal details in an issue.

The Bridge is used by real people. Any change must keep the privacy rules above (nothing identifying about the people being served, contact information only where the rules allow) and keep every test passing: `npm run lint`, `npm run build`, `npm run test:claims`, and `npm run e2e`.

## Acknowledgments

- The homepage and not-found illustrations and the logo artwork are AI-generated.
- Built with open-source software: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, Motion, Drizzle ORM, Zod, React Hook Form, next-themes, Sonner, Lucide, and the Anthropic and Neon SDKs.
- Two button designs are adapted from Uiverse.io (by ShrinilDhorda and by barisdogansutcu).

## License

To be added by the author.

## Authors

- **Kendra Anne Hartnett**
- **Claude** (Anthropic), an AI coding assistant, which contributed code, design, and documentation under Kendra Anne Hartnett's direction.
