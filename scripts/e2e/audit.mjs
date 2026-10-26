// Layout audit shared by the responsive, dashboards, and admin suites. For each page it
// measures horizontal overflow, elements wider than the screen, clipped text, overlapping
// controls, and tap targets under 44px, then records one check per page, width, and theme.

import { sleep } from "./browser.mjs"

// Measures the current page. "scopeSel" limits checks to a subtree (the chat panel).
export const MEASURE = (scopeSel) => `(async () => {
  const vw = document.documentElement.clientWidth, vh = innerHeight
  const scope = ${scopeSel ? `document.querySelector(${JSON.stringify(scopeSel)})` : "document.body"}
  const sel = (e) => {
    let s = e.tagName.toLowerCase()
    if (e.id && !/^«|^_R/.test(e.id)) s += "#" + e.id
    const cls = (e.getAttribute("class") || "").split(/\\s+/).filter(c => c && !c.includes(":") && !c.includes("[")).slice(0, 3)
    if (cls.length) s += "." + cls.join(".")
    const data = [...e.attributes].find(a => a.name.startsWith("data-") && a.name !== "data-state")
    if (data) s += "[" + data.name + (data.value && data.value !== "true" ? "=" + data.value : "") + "]"
    const t = (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40)
    return t ? s + " “" + t + "”" : s
  }
  const visible = (e) => { const cs = getComputedStyle(e); return cs.visibility !== "hidden" && cs.display !== "none" && e.getClientRects().length > 0 }
  const clippedByAncestor = (e) => { for (let n = e.parentElement; n && n !== document.documentElement; n = n.parentElement) { const cs = getComputedStyle(n); if (/(hidden|clip)/.test(cs.overflowX) || cs.position === "fixed") return true } return false }
  // Horizontal overflow
  const scrollWidth = document.documentElement.scrollWidth
  // Elements wider than / sticking out of the viewport
  const wide = []
  for (const e of scope.querySelectorAll("*")) {
    if (!visible(e)) continue
    const r = e.getBoundingClientRect()
    if (r.width > vw + 0.5 || r.right > vw + 0.5 || r.left < -0.5) {
      wide.push({ sel: sel(e), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), contained: clippedByAncestor(e) })
    }
  }
  // Keep only outermost offenders that actually escape (not inside a clipping ancestor), plus a count of contained ones
  const escaping = wide.filter(w => !w.contained)
  // Text rects
  const texts = []
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
  for (let n; (n = walker.nextNode());) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (!visible(el) || el.closest(".sr-only, svg, script, style, [aria-hidden=true]")) continue
    const range = document.createRange(); range.selectNodeContents(n)
    let rects = [...range.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5)
    // Lines hidden by line-clamp still report boxes; keep only the lines that show (judged by
    // each line's middle, so a slightly rotated element still counts its lines right).
    const clamp = el.closest("[style*=line-clamp], .line-clamp-1, .line-clamp-2, .line-clamp-3, .line-clamp-4")
    if (clamp) { const cb = clamp.getBoundingClientRect(); rects = rects.filter(r => r.top + r.height / 2 < cb.bottom) }
    texts.push({ el, rects, text: n.textContent.trim() })
  }
  // Clipped text: text outside its clipping ancestor or outside the viewport horizontally
  const clipped = []
  for (const t of texts) {
    for (let a = t.el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a)
      if (/(hidden|clip)/.test(cs.overflowX + cs.overflowY) && a.tagName !== "BODY") {
        // Text cut to a set number of lines on purpose (line-clamp, with its ellipsis) isn't
        // a layout fault; e2e:board checks the line count itself.
        if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") break
        const ar = a.getBoundingClientRect()
        if (t.rects.some(r => r.right > ar.right + 1 || r.left < ar.left - 1 || (/(hidden|clip)/.test(cs.overflowY) && (r.bottom > ar.bottom + 1 || r.top < ar.top - 1)))) clipped.push({ sel: sel(t.el), by: sel(a) })
        break
      }
    }
    if (t.rects.some(r => r.right > vw + 0.5 || r.left < -0.5)) clipped.push({ sel: sel(t.el), by: "viewport" })
    const cs = getComputedStyle(t.el)
    if (cs.textOverflow === "ellipsis" && t.el.scrollWidth > t.el.clientWidth) clipped.push({ sel: sel(t.el), by: "ellipsis" })
  }
  // Overlaps: text vs text (different elements) and text vs controls not containing it.
  const launcher = document.querySelector("[data-assistant-launcher]")
  const controls = [...scope.querySelectorAll("a, button, input, select, textarea, [role=button], [role=combobox], [role=radio]")].filter(e => visible(e) && e !== launcher && !e.closest(".sr-only"))
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
  const overlaps = []
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const A = texts[i], B = texts[j]
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue
      if (A.rects.some(a => B.rects.some(b => hit(a, b)))) overlaps.push(sel(A.el) + "  ×  " + sel(B.el))
    }
    for (const c of controls) {
      const A = texts[i]
      if (c.contains(A.el) || A.el.contains(c) || c.closest("label")?.contains(A.el)) continue
      const cr = c.getBoundingClientRect()
      if (A.rects.some(a => hit(a, cr))) overlaps.push(sel(A.el) + "  ×  control " + sel(c))
    }
  }
  // Controls overlapping each other
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
    const a = controls[i], b = controls[j]
    if (a.contains(b) || b.contains(a)) continue
    if (hit(a.getBoundingClientRect(), b.getBoundingClientRect())) overlaps.push("control " + sel(a) + "  ×  control " + sel(b))
  }
  // Chat button visible on top of a control (it should fade out there)
  if (launcher && parseFloat(getComputedStyle(launcher).opacity) > 0.5) {
    const lr = launcher.getBoundingClientRect()
    for (const c of controls) if (hit(c.getBoundingClientRect(), lr)) overlaps.push("chat button (visible)  ×  control " + sel(c))
  }
  // Tap targets
  const small = []
  for (const c of [...controls, ...(launcher && ${!scopeSel} ? [launcher] : [])]) {
    const r = c.getBoundingClientRect()
    if (r.width <= 1 || r.height <= 1 || c.closest("[aria-hidden=true]")) continue
    // A radio inside a 44px label card counts as the label's size
    let box = c.matches("input[type=radio], input[type=checkbox]") && c.closest("label") ? c.closest("label").getBoundingClientRect() : r
    // A control that extends its tap area with an invisible ::after (the language switch's
    // options) counts at that area's size.
    const after = getComputedStyle(c, "::after")
    if (after.content !== "none" && after.position === "absolute") {
      const px = (v) => Math.min(0, v === "auto" ? 0 : parseFloat(v) || 0) // only extensions count
      box = { width: r.width - px(after.left) - px(after.right), height: r.height - px(after.top) - px(after.bottom) }
    }
    // 44px, except controls deliberately marked data-compact-target, which must still meet
    // the 24px WCAG 2.2 AA minimum.
    const min = c.closest("[data-compact-target]") ? 24 : 44
    if (box.width < min - 0.5 || box.height < min - 0.5) {
      const inline = c.tagName === "A" && getComputedStyle(c).display === "inline" && c.closest("p")
      small.push({ sel: sel(c), w: Math.round(box.width), h: Math.round(box.height), inline: !!inline })
    }
  }
  // Specific wraps
  // Lines of visible text (text nodes only; icons and screen-reader text don't count)
  const lines = (e) => {
    if (!e) return null
    const ys = new Set()
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
    for (let n; (n = w.nextNode());) {
      if (!n.textContent.trim() || n.parentElement.closest(".sr-only") || !visible(n.parentElement)) continue
      const range = document.createRange(); range.selectNodeContents(n)
      for (const r of range.getClientRects()) if (r.width > 1) ys.add(Math.round(r.top))
    }
    return ys.size
  }
  const pick = (q) => [...scope.querySelectorAll(q)].filter(visible)
  const wraps = {}
  const h1 = pick("main h1")[0]
  if (h1) {
    const spans = [...h1.querySelectorAll(":scope > span")]
    wraps.headline = spans.length ? spans.map(s => ({ text: s.textContent, lines: lines(s), px: parseFloat(getComputedStyle(s).fontSize) })) : [{ text: h1.textContent.trim().slice(0, 40), lines: lines(h1), px: parseFloat(getComputedStyle(h1).fontSize) }]
  }
  const badge = pick("main p.rounded-full")[0]
  if (badge) wraps.badge = { lines: lines(badge), px: parseFloat(getComputedStyle(badge).fontSize), width: Math.round(badge.getBoundingClientRect().width) }
  const header = document.querySelector("header")
  if (header && ${!scopeSel}) {
    const kids = [...header.querySelectorAll("a, button")].filter(visible).map(e => e.getBoundingClientRect())
    const wm = header.querySelector("svg")
    wraps.header = { height: Math.round(header.getBoundingClientRect().height), oneRow: kids.every(k => Math.abs(k.top - kids[0].top) < 8 || Math.abs(k.bottom - kids[0].bottom) < 8), wordmarkWidth: wm ? Math.round(wm.getBoundingClientRect().width) : null, rightEdge: Math.round(Math.max(...kids.map(k => k.right))) }
  }
  wraps.buttonsMultiLine = pick("button, a[data-slot=button]").filter(b => lines(b) > 1).map(b => sel(b) + " (" + lines(b) + " lines)")
  wraps.emails = pick('a[href^="mailto:"]').map(a => { const s = a.querySelector("span") || a; const range = document.createRange(); range.selectNodeContents(s); const rects = [...range.getClientRects()].filter(r => r.width > 1); return { email: a.getAttribute("href").slice(7), lines: new Set(rects.map(r => Math.round(r.top))).size } })
  // Words broken mid-word: a text node whose line count exceeds its word count
  wraps.brokenWords = texts.filter(t => { const words = t.text.split(/\\s+/).length; const ys = new Set(t.rects.map(r => Math.round(r.top))).size; return ys > words }).map(t => sel(t.el))
  // Rule checks
  const rules = {}
  const main = document.querySelector("main")
  if (main && ${!scopeSel}) {
    const tr = texts.filter(t => main.contains(t.el)).flatMap(t => t.rects)
    rules.sideGap = tr.length ? [Math.round(Math.min(...tr.map(r => r.left))), Math.round(vw - Math.max(...tr.map(r => r.right)))] : null
  }
  const form = scope.querySelector("main form")
  rules.fields = pick("input:not([type=hidden]):not([type=radio]):not([type=checkbox]), textarea, button[role=combobox]").filter(e => !e.closest("[aria-hidden=true]")).map(e => {
    const box = (e.closest("form") || e.parentElement).getBoundingClientRect(), r = e.getBoundingClientRect()
    return { sel: sel(e), px: parseFloat(getComputedStyle(e).fontSize), full: r.width >= box.width - 2 }
  })
  const dt = pick("input[type=datetime-local], input[type=date], input[type=time]").map(e => e.getBoundingClientRect())
  if (dt.length > 1) rules.dateTimeStacked = dt.every((r, i) => i === 0 || r.top > dt[i - 1].top + 1)
  const cards = pick("main ul > li > [data-slot=card]")
  if (cards.length) rules.cardColumns = new Set(cards.map(c => Math.round(c.getBoundingClientRect().left))).size
  const footerBtns = pick("main [data-slot=card-footer] button")
  if (footerBtns.length) rules.cardButtonsFull = footerBtns.every(b => b.getBoundingClientRect().width >= b.closest("[data-slot=card-footer]").getBoundingClientRect().width - 50)
  const groups = pick("main [role=group]")
  if (groups.length) rules.confirmStacked = groups.every(g => { const bs = [...g.querySelectorAll("button")].map(b => b.getBoundingClientRect()); return bs.every((r, i) => i === 0 || r.top > bs[i - 1].top + 1) })
  const ctas = pick("main section:first-of-type a[data-slot=button]")
  if (ctas.length) { const rs = ctas.map(a => a.getBoundingClientRect()); rules.ctas = { widths: rs.map(r => Math.round(r.width)), stacked: rs.every((r, i) => i === 0 || r.top > rs[i - 1].top + 1), helpUnder: ctas.every(a => { const h = document.getElementById(a.getAttribute("aria-describedby")); return h && h.getBoundingClientRect().top >= a.getBoundingClientRect().bottom }) } }
  const journey = pick("main ol > li > [data-slot=card]")
  if (journey.length) rules.journey = { columns: new Set(journey.map(c => Math.round(c.getBoundingClientRect().left))).size, padding: getComputedStyle(journey[0]).paddingLeft, gap: getComputedStyle(journey[0].closest("ol")).rowGap }
  const sectionCards = pick("main section [data-slot=card]").filter(c => !c.closest("ol"))
  if (sectionCards.length) rules.sectionCardPadding = [...new Set(sectionCards.map(c => getComputedStyle(c.querySelector("[data-slot=card-content]") || c).paddingLeft))]
  const desc = pick("main section:first-of-type p").find(p => p.textContent.startsWith("The Bridge closes"))
  if (desc) rules.heroLine = { px: parseFloat(getComputedStyle(desc).fontSize), width: Math.round(desc.getBoundingClientRect().width) }
  const meta = document.querySelector('meta[name=viewport]')?.content
  return { vw, scrollWidth, overflow: scrollWidth > vw, escaping, containedWide: wide.length - escaping.length, containedWideSel: wide.filter(w => w.contained).map(w => w.sel).slice(0, 4), clipped, overlaps: [...new Set(overlaps)], small, wraps, rules, meta }
})()`

const LONG_EMAIL = "outreach.coordinator.northwest.side.mutual.aid@community-organizations-of-greater-chicago.example.org"

/**
 * Widths and themes come from --widths=320,390 and --themes=light,dark (defaults: 320, 390,
 * 768, 1024, 1280, 1440 in both themes). --long swaps every contact email for a very long one.
 * --shots saves a full-page screenshot of each audited page.
 */
export function auditOptions(suite) {
  const { widths = "320,390,768,1024,1280,1440", themes = "light,dark" } = suite.flags
  return { widths: String(widths).split(",").map(Number), themes: String(themes).split(","), long: !!suite.flags.long, shots: !!suite.flags.shots }
}

export function createAudit(suite) {
  const opts = auditOptions(suite)
  const pages = []
  async function audit(t, page, width, theme, scope) {
    if (opts.long) await t.evaluate(`document.querySelectorAll('a[href^="mailto:"]').forEach(a => { a.href = "mailto:${LONG_EMAIL}"; const s = a.querySelector("span"); const [u, d] = "${LONG_EMAIL}".split("@"); s.replaceChildren(u + "@", document.createElement("wbr"), d) }), true`)
    const m = await t.evaluate(MEASURE(scope))
    pages.push({ page, width, theme, ...m })
    const small = m.small.filter((s) => !s.inline)
    const flags = [
      m.overflow ? `overflow ${m.scrollWidth}>${m.vw}` : "",
      m.escaping.length ? `wider than the screen: ${m.escaping.map((e) => e.sel ?? e).slice(0, 3).join(", ")}` : "",
      m.clipped.length ? `clipped: ${JSON.stringify(m.clipped.slice(0, 3))}` : "",
      m.overlaps.length ? `overlapping: ${m.overlaps.slice(0, 3).join(", ")}` : "",
      small.length ? `under 44px: ${JSON.stringify(small.slice(0, 3))}` : "",
    ].filter(Boolean)
    suite.check(`${page} · ${width}px ${theme}: no overflow, clipping, overlap, or small targets`, flags.length === 0, flags.join(" | "))
    if (opts.shots) await t.shot(`${page.replace(/\W+/g, "-")}-${width}-${theme}.png`, { full: true })
  }
  return { audit, pages, ...opts, sleep }
}
