import { sleep } from "./browser.mjs"

// Text contrast for everything visible on the current page, computed from the styles:
// each text element's color over its stacked backgrounds (translucent layers composited).
// Needs 4.5:1, or 3:1 for large text (24px, or 18.66px bold). Text over a background image
// or gradient is listed in "complex" for a pixel check instead.

export const TEXT_CONTRAST = `(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1
  const ctx = cv.getContext("2d", { willReadFrequently: true })
  const rgba = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "rgba(0,0,0,0)"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1) }
  const lum = (c) => { const v = c.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
  const bgOf = (el) => {
    const layers = []; let complex = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.backgroundImage !== "none" && n !== document.documentElement) complex = true
      const c = rgba(cs.backgroundColor)
      if (c[3] > 0) { layers.push(c); if (c[3] >= 1) break }
    }
    let bg = [255, 255, 255, 1]
    for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)
    return { bg, complex }
  }
  const out = { checked: 0, failures: [], complex: [] }
  const seen = new Set()
  const els = [...document.querySelectorAll("body *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
  for (const el of els) {
    if (el.closest("[aria-hidden=true], option, script, style, .sr-only")) continue
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue
    const cs = getComputedStyle(el)
    if (parseFloat(cs.opacity) < 1 || el.closest("[disabled]")) continue
    const { bg, complex } = bgOf(el)
    const fg = over(rgba(cs.color), bg)
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
    const v = ratio(fg, bg); out.checked++
    const label = el.tagName.toLowerCase() + ' "' + el.textContent.trim().replace(/\\s+/g, " ").slice(0, 40) + '"'
    if (complex) { if (!seen.has(label)) out.complex.push(label + " " + v.toFixed(2)); seen.add(label) }
    if (v < need && !seen.has("f" + label)) { seen.add("f" + label); out.failures.push(label + " " + v.toFixed(2) + " < " + need) }
  }
  for (const el of document.querySelectorAll("input[placeholder], textarea[placeholder]")) {
    if (!el.checkVisibility()) continue
    const { bg } = bgOf(el); const fg = over(rgba(getComputedStyle(el, "::placeholder").color), bg)
    const v = ratio(fg, bg); out.checked++
    if (v < 4.5) out.failures.push("placeholder of " + el.name + " " + v.toFixed(2))
  }
  out.minRatioBody = ratio(over(rgba(getComputedStyle(document.body).color), bgOf(document.body).bg), bgOf(document.body).bg).toFixed(2)
  return out
})()`

// Text elements inside the scope, with their text boxes in device pixels (the screenshot's
// pixels: on a 2x screen each CSS pixel is 2x2 of them).
const TARGETS = (scope) => `(() => {
  const out = []
  for (const el of [...document.querySelectorAll(${JSON.stringify(scope)}), ...document.querySelectorAll(${JSON.stringify(scope)} + " *")]) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim())
    if (!own.length || !el.checkVisibility()) continue
    const rects = []
    for (const n of own) { const r = document.createRange(); r.selectNodeContents(n); for (const b of r.getClientRects()) if (b.width > 1 && b.height > 1) rects.push({ x: b.x * devicePixelRatio, y: b.y * devicePixelRatio, w: b.width * devicePixelRatio, h: b.height * devicePixelRatio }) }
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

/**
 * The lowest text ratio inside the scope, measured from real pixels: hide all text,
 * screenshot, then compare each text color with every background pixel inside its own text
 * boxes. Returns { name, worst, need } for the worst element.
 */
export async function lowestPixelContrast(t, scope) {
  await t.evaluate(`document.querySelector(${JSON.stringify(scope)}).scrollIntoView({ block: "start" }), true`); await sleep(200)
  const targets = await t.evaluate(TARGETS(scope))
  await t.evaluate(`(() => { const s = document.createElement("style"); s.id = "px-hide"; s.textContent = "body * { color: transparent !important; text-decoration-color: transparent !important; text-shadow: none !important } [data-assistant-launcher] { display: none !important }"; document.head.append(s); return true })()`)
  await sleep(80)
  const { data } = await t.send("Page.captureScreenshot", { format: "png" })
  await t.evaluate(`document.getElementById("px-hide").remove(), true`)
  const rows = await t.evaluate(MEASURE("data:image/png;base64," + data, targets))
  return rows.sort((a, b) => a.worst - b.worst)[0] ?? { name: `no text found in ${scope}`, worst: 0, need: 4.5 }
}
