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
