// The Post a Need "Type of support" dropdown: the highlighted option uses the muted fill
// (not gold) with readable text, in both themes; the privacy notice stays exact.
//   npm run e2e:dropdown

import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"
import { NEW_REQUEST_COPY } from "../../src/lib/copy.ts"

const suite = await setup("dropdown")
const browser = await launchBrowser(suite)
const { check } = suite

try {
  const t = await browser.newTab({ log: true })
  await t.signIn("test.outreach1@example.com")
  for (const theme of ["light", "dark"]) {
    await t.goto("/requests/new"); await t.theme(theme); await t.reload(); await sleep(1000)
    const notice = await t.evaluate(`document.querySelector("aside[aria-label=Privacy]")?.innerText.trim()`)
    check(`${theme}: notice text exact, lock icon kept`, notice === NEW_REQUEST_COPY.privacy && await t.evaluate(`!!document.querySelector("aside[aria-label=Privacy] svg.lucide-lock")`), notice)
    await t.evaluate(`document.querySelector("[role=combobox]").focus()`); await t.key("ArrowDown", "ArrowDown", 40); await sleep(500)
    await t.waitFor(`!!document.querySelector("[role=option][data-highlighted]")`, "highlighted option")
    const m = await t.evaluate(`(() => {
      const cv = document.createElement("canvas"); cv.width = cv.height = 1; const ctx = cv.getContext("2d", { willReadFrequently: true })
      const rgba = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data] }
      const lum = (c) => { const v = c.slice(0,3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2] }
      const el = document.querySelector("[role=option][data-highlighted]"); const cs = getComputedStyle(el)
      const tok = (n) => rgba(getComputedStyle(document.documentElement).getPropertyValue(n).trim())
      const bg = rgba(cs.backgroundColor), fg = rgba(cs.color)
      const [a, b] = [lum(fg), lum(bg)].sort((p, q) => q - p)
      return { option: el.innerText.trim(), bg: bg.slice(0,3).join(","), fg: fg.slice(0,3).join(","), bgIsMuted: bg.join() === tok("--muted").join(), bgIsGold: bg.join() === tok("--accent").join(), ratio: +((a + 0.05) / (b + 0.05)).toFixed(2) }
    })()`)
    await t.shot(`dropdown-${theme}.png`)
    check(`${theme}: highlighted option uses muted, not gold (${m.option})`, m.bgIsMuted && !m.bgIsGold, `bg rgb(${m.bg}), text rgb(${m.fg})`)
    check(`${theme}: highlighted option text contrast >= 4.5`, m.ratio >= 4.5, `${m.ratio}:1`)
    await t.key("Escape", "Escape", 27)
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
