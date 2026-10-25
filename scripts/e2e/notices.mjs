// Real-pixel text contrast for the Notice component: the pending and rejected account-status
// banners as they render, plus all four tones (info, success, warning, error) built from the
// class strings in src/components/notice.tsx, on the page background and inside a card.
// Method: hide all text, screenshot, then compare each text color with every background
// pixel inside its own text boxes (worst case). Text needs 4.5:1 (3:1 if large).
//   npm run e2e:notices

import fs from "node:fs"

import { launchBrowser } from "./browser.mjs"
import { lowestPixelContrast as lowest } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("notices")
const browser = await launchBrowser(suite)
const { check, sql } = suite

// The tones' classes, read from the component so this never drifts from it.
const source = fs.readFileSync("src/components/notice.tsx", "utf8")
const BASE_CLASSES = source.match(/cn\("(flex items-start[^"]*)"/)[1]
const TONES = Object.fromEntries(
  ["info", "success", "warning", "error"].map((tone) => [tone, source.match(new RegExp(`${tone}: \\{\\s*className: "([^"]+)"`))[1]])
)

// Copies each tone after the given element (inside the same container), with sample text
// of the length real notices use.
const INJECT = (afterSelector) => `(() => {
  const anchor = document.querySelector(${JSON.stringify(afterSelector)})
  const box = document.createElement("div"); box.id = "notice-samples"; box.style.cssText = "display:grid;gap:12px;margin-top:12px"
  for (const [tone, cls] of Object.entries(${JSON.stringify(TONES)})) {
    const n = document.createElement("div"); n.className = ${JSON.stringify(BASE_CLASSES)} + " " + cls; n.dataset.tone = tone
    n.innerHTML = '<svg aria-hidden="true" class="mt-0.5 size-5 shrink-0" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/></svg><div class="min-w-0"><p>' + tone + ' notice: sample text with a <a href="#" class="font-semibold underline">link</a> in it.</p></div>'
    box.append(n)
  }
  anchor.after(box)
  return true
})()`

const report = []
const record = (label, row) => {
  report.push({ label, ...row })
  check(`${label}: lowest text contrast ${row?.worst}:1`, row && row.worst >= row.need, row?.name)
}

try {
  const donor3 = await browser.newTab({ width: 1280, height: 1400 })
  await donor3.signIn("test.donor3@example.com")
  const anon = await browser.newTab({ width: 1280, height: 1400 })

  for (const theme of ["light", "dark"]) {
    for (const width of [390, 1280]) {
      const tag = `${theme} ${width}px`
      for (const t of [donor3, anon]) { await t.size(width, 1400); await t.goto("/"); await t.theme(theme) }

      await sql`update users set verification_status = 'pending' where email = 'test.donor3@example.com'`
      await donor3.goto("/dashboard")
      record(`Pending banner · ${tag}`, await lowest(donor3, 'section[aria-label="Account status"]'))
      await donor3.evaluate(INJECT('section[aria-label="Account status"]'))
      for (const tone of Object.keys(TONES)) record(`Notice ${tone} on the page · ${tag}`, await lowest(donor3, `[data-tone=${tone}]`))

      // The rejected state is set directly; finish() reseeds it back to pending.
      await sql`update users set verification_status = 'rejected' where email = 'test.donor3@example.com'`
      await donor3.goto("/dashboard")
      record(`Rejected banner · ${tag}`, await lowest(donor3, 'section[aria-label="Account status"]'))
      if (width === 1280) await donor3.shot(`banner-rejected-${theme}.png`)

      // Inside a card: the sign-in form, where form errors appear.
      await anon.goto("/sign-in")
      await anon.evaluate(INJECT("#panel-sign-in form > *:first-child"))
      for (const tone of Object.keys(TONES)) record(`Notice ${tone} in a card · ${tag}`, await lowest(anon, `[data-tone=${tone}]`))
      if (width === 1280) await anon.shot(`notices-in-card-${theme}.png`)
    }
  }
  fs.writeFileSync(`${suite.outDir}/contrast.json`, JSON.stringify(report, null, 2))
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
