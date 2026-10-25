// Layout audit of the sign-in and create-account forms (with their errors showing) and the
// organization dashboards: pending, rejected, and approved.
//   npm run e2e:dashboards [-- --widths=320,390 --themes=dark --shots]

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("dashboards")
const browser = await launchBrowser(suite)
const { audit, widths, themes } = createAudit(suite)
const { sql } = suite

try {
  const anon = await browser.newTab(), pend = await browser.newTab(), donor = await browser.newTab()
  await pend.signIn("test.donor3@example.com")
  await donor.signIn("test.donor1@example.com")

  for (const theme of themes) {
    for (const t of [anon, pend, donor]) { await t.goto("/"); await t.theme(theme) }
    for (const w of widths) {
      for (const t of [anon, pend, donor]) await t.size(w)
      await anon.goto("/sign-in", 1400); await audit(anon, "sign-in tab", w, theme)
      await anon.goto("/sign-in?role=outreach", 1400); await audit(anon, "create: posting needs", w, theme)
      await anon.evaluate(`document.querySelector('#panel-create button[type=submit]').click(), true`); await sleep(300)
      await audit(anon, "create: posting needs (errors)", w, theme)
      await anon.goto("/sign-in?role=donor", 1400); await audit(anon, "create: organization", w, theme)
      await anon.evaluate(`document.querySelector('#panel-create button[type=submit]').click(), true`); await sleep(300)
      await audit(anon, "create: organization (errors)", w, theme)
      await pend.goto("/dashboard", 1400); await audit(pend, "dashboard: pending org", w, theme)
      // The rejected state is set directly; finish() reseeds it back to pending.
      await sql`update users set verification_status = 'rejected' where email = 'test.donor3@example.com'`
      await pend.goto("/dashboard", 1400); await audit(pend, "dashboard: rejected org", w, theme)
      await sql`update users set verification_status = 'pending' where email = 'test.donor3@example.com'`
      await donor.goto("/dashboard", 1400); await audit(donor, "dashboard: approved org", w, theme)
    }
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
