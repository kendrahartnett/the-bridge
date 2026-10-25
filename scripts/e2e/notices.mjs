// Real-pixel text contrast for the Notice component: the pending and rejected account-status
// banners as they render, plus all four tones (info, success, warning, error) built from the
// class strings in src/components/notice.tsx, on the page background and inside a card.
// Method: hide all text, screenshot, then compare each text color with every background
// pixel inside its own text boxes (worst case). Text needs 4.5:1 (3:1 if large).
//   npm run e2e:notices

import fs from "node:fs"

import { launchBrowser, sleep } from "./browser.mjs"
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

// Text elements inside the scope, with their text boxes.
const TARGETS = (scope) => `(() => {
  const out = []
  for (const el of document.querySelectorAll(${JSON.stringify(scope)} + " *")) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
    if (!own.length || !el.checkVisibility()) continue
    const rects = []
    for (const n of own) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) if (b.width > 1 && b.height > 1) rects.push({ x: b.x, y: b.y, w: b.width, h: b.height }) }
    const cs = getComputedStyle(el)
    out.push({ name: el.tagName.toLowerCase() + ' "' + el.textContent.trim().replace(/\\s+/g, " ").slice(0, 32) + '"', color: cs.color, size: parseFloat(cs.fontSize), bold: parseInt(cs.fontWeight) >= 700, rects })
  }
  return out
})()`

const MEASURE = (dataUrl, targets) => `(async () => {
  const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode()
  const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height
  const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0)
  const p = document.createElement("canvas").getContext("2d"); const parse = (c) => { p.clearRect(0,0,1,1); p.fillStyle = c; p.fillRect(0,0,1,1); return [...p.getImageData(0,0,1,1).data] }
  const lum = (r, g, b) => [r, g, b].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  return ${JSON.stringify(targets)}.map(t => {
    const fg = parse(t.color), lf = lum(fg[0], fg[1], fg[2]); let worst = Infinity
    for (const r of t.rects) {
      const x = Math.max(0, Math.round(r.x)), y = Math.max(0, Math.round(r.y)), w = Math.max(1, Math.min(cv.width - x, Math.round(r.w))), h = Math.max(1, Math.min(cv.height - y, Math.round(r.h)))
      const d = ctx.getImageData(x, y, w, h).data
      for (let i = 0; i < d.length; i += 4) { const lb = lum(d[i], d[i+1], d[i+2]); const [a, b] = [lf, lb].sort((m, n) => n - m); worst = Math.min(worst, (a + 0.05) / (b + 0.05)) }
    }
    return { name: t.name, worst: +worst.toFixed(2), need: t.size >= 24 || (t.size >= 18.66 && t.bold) ? 3 : 4.5 }
  })
})()`

/** The lowest text ratio inside the scope, measured from real pixels. */
async function lowest(t, scope) {
  await t.evaluate(`document.querySelector(${JSON.stringify(scope)}).scrollIntoView({ block: "start" }), true`); await sleep(200)
  const targets = await t.evaluate(TARGETS(scope))
  await t.evaluate(`(() => { const s = document.createElement("style"); s.id = "px-hide"; s.textContent = "body * { color: transparent !important; text-decoration-color: transparent !important; text-shadow: none !important } [data-assistant-launcher] { display: none !important }"; document.head.append(s); return true })()`)
  await sleep(80)
  const { data } = await t.send("Page.captureScreenshot", { format: "png" })
  await t.evaluate(`document.getElementById("px-hide").remove(), true`)
  const rows = await t.evaluate(MEASURE("data:image/png;base64," + data, targets))
  return rows.sort((a, b) => a.worst - b.worst)[0]
}

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
