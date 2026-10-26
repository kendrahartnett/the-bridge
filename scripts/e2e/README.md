# Browser test suites

Headless Chrome checks of the running app, driven over the DevTools protocol (no extra
dependencies). They sign in as the seeded test accounts and change data, so they run only
against **the-bridge-dev** and a **local** server:

- `DATABASE_URL` in `.env.local` must point at the-bridge-dev, or the suite refuses to start.
- The server must be on localhost (default `http://localhost:3100`; set `E2E_BASE_URL` to change
  the port). A deployed site is refused.
- Dev test data is reseeded before each suite and again when it ends.

## Run

```sh
npm run build
npx next start -p 3100        # in another terminal
npm run e2e                   # every suite, or one at a time:
npm run e2e:responsive
```

| Script | Checks |
|---|---|
| `e2e:responsive` | Layout of landing, chat panel, sign-in, both dashboards, Post a Need |
| `e2e:dashboards` | Layout of the sign-in and create-account forms and the pending, rejected and approved organization dashboards |
| `e2e:admin` | Layout of the admin review page, its tabs and confirmations |
| `e2e:contact` | Who sees which contact email, before and after an offer |
| `e2e:nav` | Header links, phone menu, focus, 44px targets |
| `e2e:verification` | /admin access (real 404), review details, approve and revoke |
| `e2e:form` | Post a Need privacy notice, text contrast, no horizontal scroll |
| `e2e:dropdown` | Post a Need dropdown highlight color and contrast |
| `e2e:panel` | Chat panel layout, focus, keyboard, contrast, limits |
| `e2e:notices` | Real-pixel text contrast of the account-status banners and every Notice tone, on the page and in a card |
| `e2e:homepage` | Hero reading order on phones, layout shift, photo format, caption and alt text, logo sizes, reduced motion |
| `e2e:signin` | Sign-in page structure and text contrast, tabs and account-type cards, form error, header active bar and phone menu |
| `e2e:a11y` | Every page, each kind of account, both themes at 390 and 1280px: text contrast, one h1, landmarks, page language, alt text, named controls, no overflow; reduced motion |
| `e2e:board` | Needs Board and need pages: who may open them (HTTP status and emails in the HTML for every account), the identical 404, sticky-note layout (strip, curl, 3-line cut, stamp, tilt), note contrast from real pixels, keyboard, both themes at 320–1280px, reduced motion |

Options (after `--`, e.g. `npm run e2e:responsive -- --themes=dark`):

- Layout audits: `--widths=320,390` and `--themes=light,dark` (default: 320, 390, 768, 1024, 1280
  and 1440 in both themes), `--shots` to save screenshots, `--long` to swap contact emails for a
  very long one.
- `e2e:panel -- --live` also sends one real question to the assistant.
- `e2e:verification -- --signups` also signs up a new poster and organization through the
  forms. It creates two accounts on the-bridge-dev that reseeding doesn't remove, so it only
  works once until they're deleted.

On Windows, `npm run e2e` keeps the computer awake while it runs: when the screen turns off,
Windows' Modern Standby pauses every process, which froze runs mid-suite. If a single suite is
run on its own and the computer sleeps, the failure says so.

Screenshots and `results.json` go to `test-results/e2e/<suite>/` (git-ignored). Chrome is found
at `CHROME_PATH`, or its usual install location.
