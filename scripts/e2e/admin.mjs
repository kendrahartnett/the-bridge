// Layout audit of the admin review page: each tab and each confirmation (opened, never
// confirmed), plus the admin's own dashboard with the Admin header link.
//   npm run e2e:admin [-- --widths=320,390 --themes=dark --shots]

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("admin")
const browser = await launchBrowser(suite)
const { audit, widths, themes } = createAudit(suite)

const ORG_C = "Test — Organization C (pending)"
const card = (name) => `[...document.querySelectorAll("main [data-slot=card]")].find(c => c.querySelector("[data-slot=card-title]")?.textContent.trim() === ${JSON.stringify(name)})`

try {
  const adm = await browser.newTab()
  await adm.signIn("test.admin@example.com")
  const press = (name, label) => adm.evaluate(`[...(${card(name)}).querySelectorAll("button")].find(b => b.textContent.trim() === ${JSON.stringify(label)}).click(), true`)

  for (const theme of themes) {
    await adm.goto("/"); await adm.theme(theme)
    for (const w of widths) {
      await adm.size(w)
      await adm.goto("/dashboard", 1400); await audit(adm, "admin's dashboard (header link)", w, theme)
      await adm.goto("/admin", 1400); await audit(adm, "admin: Pending tab", w, theme)
      await press(ORG_C, "Approve"); await sleep(250); await audit(adm, "admin: Approve confirmation", w, theme)
      await press(ORG_C, "Not now"); await sleep(150); await press(ORG_C, "Reject"); await sleep(250)
      await audit(adm, "admin: Reject with note", w, theme)
      await adm.goto("/admin?tab=approved", 1400); await audit(adm, "admin: Approved tab", w, theme)
      await press("Test — Corner Bakery Co-op", "Revoke approval"); await sleep(250)
      await audit(adm, "admin: Revoke confirmation", w, theme)
      await adm.goto("/admin?tab=rejected", 1400); await audit(adm, "admin: Rejected tab", w, theme)
    }
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
