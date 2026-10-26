// Responsive layout audit: landing, chat panel, sign-in, both dashboards (with their
// confirmations open), and the Post a Need form, at each width and theme.
//   npm run e2e:responsive [-- --widths=320,390 --themes=dark --shots --long]

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("responsive")
const browser = await launchBrowser(suite)
const { audit, widths, themes, long } = createAudit(suite)

const L = `document.querySelector("[data-assistant-launcher]")`
const P = "[data-assistant-panel]"
// A seeded Open need (outreach1's "Hot meals").
const OPEN_NEED = "5eed0000-0000-4000-8000-000000000001"
const click = (t, label, within = "main") =>
  t.evaluate(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(within)} + " button")].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!b) throw new Error("no button " + ${JSON.stringify(label)}); b.click(); return true })()`)

try {
  const anon = await browser.newTab(), outreach = await browser.newTab(), donor = await browser.newTab()
  await outreach.signIn("test.outreach1@example.com")
  await donor.signIn("test.donor1@example.com")

  for (const theme of themes) {
    for (const t of [anon, outreach, donor]) { await t.goto("/"); await t.theme(theme) }
    for (const w of widths) {
      for (const t of [anon, outreach, donor]) await t.size(w)
      if (!long) {
        await anon.goto("/", 1400); await audit(anon, "landing", w, theme)
        await anon.evaluate(`${L}.click(), true`); await sleep(500)
        await audit(anon, "chat panel (open, landing)", w, theme, P)
        await anon.goto("/sign-in", 1400); await audit(anon, "sign-in", w, theme)
        await anon.goto("/sign-in?role=donor", 1400); await audit(anon, "sign-in (organization picked)", w, theme)
      }
      await outreach.goto("/dashboard", 1400); await audit(outreach, "outreach dashboard", w, theme)
      await click(outreach, "Cancel"); await sleep(300)
      await audit(outreach, "outreach dashboard (Cancel confirm)", w, theme)
      if (!long) { await outreach.goto("/requests/new", 1400); await audit(outreach, "/requests/new", w, theme) }
      await donor.goto("/dashboard", 1400); await audit(donor, "organization dashboard", w, theme)
      await donor.goto("/board", 1400); await audit(donor, "Needs Board", w, theme)
      await donor.goto(`/requests/${OPEN_NEED}?from=board`, 1400); await audit(donor, "need page (open)", w, theme)
      await click(donor, "Claim this need"); await sleep(300)
      await audit(donor, "need page (Claim confirm)", w, theme)
      if (!long) {
        await donor.goto("/dashboard", 1400)
        await donor.evaluate(`${L}?.click(), true`); await sleep(500)
        await audit(donor, "chat panel (open, org dashboard)", w, theme, P)
      }
    }
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
