# Security notes

Known issues we have reviewed and deliberately deferred, with what they affect.

## Open

### zod below 4.6.6, bundled inside @neondatabase/auth (high)

- **Advisory:** [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5): "Zod can exhaust memory while validating oversized constrained collections" (CWE-770, uncontrolled resource consumption).
- **Severity:** high. Affected range: `zod <4.6.6`.
- **Where:** a nested copy, `node_modules/@neondatabase/auth/node_modules/zod` (version 4.5.4), pulled in by `@neondatabase/auth` 0.7.0-beta and `@neondatabase/auth-ui`.
- **What it affects:** the Neon Auth SDK's own validation during sign-in and sign-up. The Bridge's code (request form, server actions, chat route) uses its own `zod` 4.6.7, which is already patched.
- **Fix:** npm reports only a semver-major fix through `@neondatabase/auth`, so it means upgrading the auth package.
- **Decision (2026-10-24):** not now. Address it together with the production sign-in fix.
- **Found by:** `npm audit`.
