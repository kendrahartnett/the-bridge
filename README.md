This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Databases: development and production

The Bridge uses two separate Neon projects:

| | Neon project | Used by | Data |
|---|---|---|---|
| Development | `the-bridge-dev` | `.env.local` (local app, seed, tests) | Fictional test accounts and requests only |
| Production | `the-bridge` (branch `production`) | Vercel, and `.env.prod.local` for migrations | Real accounts and requests |

Each project has its own Neon Auth, so logins and sessions never cross between them.

- `npm run db:migrate`: apply migrations to development.
- `npm run db:seed`: reset development's test accounts and requests, including `test.admin@example.com` (admin). Runs only against `the-bridge-dev`.
- `npm run test:claims`: request and verification rules. Runs only against `the-bridge-dev`.
- `npm run admin:grant -- <email>`: make an existing account an admin, on whichever database `.env.local` points to.
- `npm run admin:grant:prod -- <email>`: the same on production. Reads only `.env.prod.local`, shows the target project and email, and changes nothing unless you type `yes`.
- `npm run db:migrate:prod -- --confirm`: apply migrations to production, after testing them on development. Reads `.env.prod.local`, which is never committed.

The seed and test scripts check the database before doing anything and exit if it isn't `the-bridge-dev` (see `src/db/dev-guard.ts`).

Keep production's values in `.env.prod.local`, never `.env.production.local`: Next.js loads `.env.production.local` automatically whenever the app runs in production mode (`next build`, `next start`), and it overrides `.env.local`, so a local production build would quietly connect to the real database.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Known limitations

- **Assistant rate limit is per server instance.** `/api/chat` allows 20 requests per IP per hour, counted in each server instance's memory, so on serverless hosting (Vercel) the limit is enforced per instance rather than exactly across the whole site.
