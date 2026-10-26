// The homepage: the stacked, centered hero (eyebrow on one line, the headline artwork as the
// page's h1, the line and description, then the two calls to action), no layout shift, the
// artwork served as AVIF or WebP, the hero above the fold on laptop screens, the illustration
// between "What is The Bridge?" and the Mission Statement, the dark-mode panel behind the
// headline artwork, text contrast from real pixels, the logo's sizes, and reduced motion.
//   npm run e2e:homepage

import { launchBrowser, sleep } from "./browser.mjs"
import { lowestPixelContrast } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { BRIDGE_IMAGE, HERO_IMAGE } from "../../src/lib/copy.ts"

const suite = await setup("homepage")
const browser = await launchBrowser(suite)
const { check } = suite

// Layout shift over the page's first 2.5 seconds (CLS: sum of shifts not caused by input).
const CLS = `new Promise((resolve) => {
  let cls = 0
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value }).observe({ type: "layout-shift", buffered: true })
  setTimeout(() => resolve(+cls.toFixed(4)), 2500)
})`

const HERO = `(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, center: r.left + r.width / 2 } }
  const section = document.querySelector("main section"), h1 = document.querySelector("main h1"), img = h1.querySelector("img")
  // The hero's content container (the h1's parent; the section's first div is the background layer).
  const container = h1.parentElement, ps = container.querySelectorAll(":scope > p")
  const ctas = [...section.querySelectorAll('a[href^="/sign-in?role="]')]
  const cs = getComputedStyle(container)
  const inner = { left: container.getBoundingClientRect().left + parseFloat(cs.paddingLeft), right: container.getBoundingClientRect().right - parseFloat(cs.paddingRight) }
  return {
    h1Count: document.querySelectorAll("h1").length, h1Images: h1.querySelectorAll("img").length, h1Text: h1.textContent.trim(),
    alt: img.alt, loading: img.loading, fetchPriority: img.fetchPriority, imgHasSize: img.hasAttribute("width") && img.hasAttribute("height"),
    eyebrow: box(ps[0]), art: box(h1), every: box(ps[1]), lead: box(ps[2]), desc: box(ps[3]), ctas: ctas.map(box), ctaCount: ctas.length,
    pageCenter: (inner.left + inner.right) / 2, innerWidth: inner.right - inner.left,
    artPanel: getComputedStyle(h1).backgroundColor,
    noHelper: !/Request support for someone|Respond with food, clothing/.test(section.innerText),
    noArch: !section.querySelector(".arch-draw"),
    overflow: document.documentElement.scrollWidth > innerWidth,
    headerRow: (() => { const cs = [...document.querySelectorAll("header a, header button")].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect()); return cs.every((r) => Math.abs(r.top + r.height / 2 - (cs[0].top + cs[0].height / 2)) < 8) })(),
  }
})()`

// The eyebrow's text, rendered lines (of the text itself), size, spacing and overflow.
const EYEBROW = `(() => {
  const eb = document.querySelector("main section p"), cs = getComputedStyle(eb), line = eb.querySelector("span")
  const text = [...eb.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()
  const r = document.createRange(); r.selectNodeContents([...eb.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()))
  const lines = new Set([...r.getClientRects()].map((b) => Math.round(b.top))).size
  const box = r.getBoundingClientRect()
  return { text, lines, font: cs.fontSize, tracking: cs.letterSpacing, overflow: eb.scrollWidth > eb.clientWidth + 0.5 || box.left < 15.5 || box.right > innerWidth - 15.5, lineShown: !!line && line.getClientRects().length > 0 }
})()`

const LOGO = `(() => {
  const link = document.querySelector("header a[aria-label]")
  const shown = [...link.querySelectorAll("img")].filter((i) => i.getClientRects().length)
  return { label: link.getAttribute("aria-label"), shown: shown.length, alt: shown[0]?.alt, src: shown[0]?.currentSrc.match(/logo-(dark|light)/)?.[1], width: Math.round(shown[0]?.getBoundingClientRect().width ?? 0) }
})()`

try {
  const t = await browser.newTab({ log: true })
  for (const theme of ["light", "dark"]) {
    await t.goto("/"); await t.theme(theme)
    for (const w of [320, 360, 390, 640, 768, 1024, 1280, 1440]) {
      const tag = `${theme} ${w}px`
      await t.size(w)
      await t.send("Network.setCacheDisabled", { cacheDisabled: true })
      await t.goto("/", 300)
      const cls = await t.evaluate(CLS)
      check(`${tag}: layout shift under 0.02`, cls < 0.02, `CLS ${cls}`)

      const H = await t.evaluate(HERO)
      check(`${tag}: no horizontal overflow; header on one row`, !H.overflow && H.headerRow)
      check(`${tag}: one h1, holding only the headline artwork, its alt text "${HERO_IMAGE.alt}"`, H.h1Count === 1 && H.h1Images === 1 && H.h1Text === "" && H.alt === HERO_IMAGE.alt && H.imgHasSize, H)
      check(`${tag}: no text headline, gold arch connector, or CTA helper text`, H.noArch && H.noHelper)
      const order = [H.eyebrow, H.art, H.every, H.lead, H.desc].every((b, i, all) => i === 0 || b.top >= all[i - 1].bottom - 0.5) && H.ctas.every((c) => c.top >= H.desc.bottom - 0.5)
      const centered = [H.eyebrow, H.art, H.every].every((b) => Math.abs(b.center - H.pageCenter) <= 2) && Math.abs((Math.min(...H.ctas.map((c) => c.left)) + Math.max(...H.ctas.map((c) => c.right))) / 2 - H.pageCenter) <= 2
      check(`${tag}: stacked and centered: eyebrow, artwork, line, lead, description, then the buttons`, order && centered, { order, centered })
      if (w < 640) check(`${tag}: artwork full container width on phones`, Math.abs(H.art.width - H.innerWidth) <= 1, `${Math.round(H.art.width)} / ${Math.round(H.innerWidth)}`)
      const sideBySide = Math.abs(H.ctas[0].top - H.ctas[1].top) < 1
      check(`${tag}: two buttons, 44-48px tall, ${w >= 640 ? "side by side" : "stacked"}`, H.ctaCount === 2 && H.ctas.every((c) => c.height >= 44 && c.height <= 48.5) && sideBySide === w >= 640, H.ctas.map((c) => Math.round(c.height)))
      check(`${tag}: ${theme === "dark" ? "light panel behind the headline artwork" : "no panel behind the headline artwork"}`, theme === "dark" ? H.artPanel === "rgb(245, 242, 234)" : H.artPanel === "rgba(0, 0, 0, 0)", H.artPanel)

      const eb = await t.evaluate(EYEBROW)
      check(`${tag}: eyebrow on one line, no overflow (${eb.font}, letter spacing ${eb.tracking})`, eb.text === "Rooted in Chicago · Built for change" && eb.lines === 1 && !eb.overflow && parseFloat(eb.font) >= 10 && eb.lineShown === w >= 640, eb)

      const logo = await t.evaluate(LOGO)
      const want = w < 360 ? 100 : w < 640 ? 110 : 130
      check(`${tag}: logo ${want}px wide, the ${theme} version, decorative, link named "The Bridge, home"`, logo.shown === 1 && logo.width === want && logo.src === theme && logo.alt === "" && logo.label === "The Bridge, home", logo)

      if ([320, 390, 1280].includes(w)) {
        check(`${tag}: headline artwork loaded eagerly at high priority`, H.loading === "eager" && H.fetchPriority === "high", `${H.loading}/${H.fetchPriority}`)
        const type = t.images.filter((i) => i.url.includes("hero-landing-image")).at(-1)?.mimeType ?? "not loaded"
        check(`${tag}: headline artwork served as AVIF or WebP`, /image\/(avif|webp)/.test(type), type)
        await sleep(600) // let the entrance animation finish before measuring pixels
        for (const [sel, name] of [["main h1 ~ p:nth-of-type(2)", "Every Connection line"], ["main h1 ~ p:nth-of-type(4)", "description"]]) {
          const c = await lowestPixelContrast(t, sel)
          check(`${tag}: ${name} readable (${c.need}:1 needed)`, c.worst >= c.need, `${c.worst}:1`)
        }
        await t.evaluate("scrollTo(0, 0), true"); await sleep(200)
        await t.shot(`home-${theme}-${w}.png`)
      }

      // The illustration between "What is The Bridge?" and the Mission Statement.
      const art = await t.evaluate(`(() => {
        const img = [...document.querySelectorAll("main img")].find((i) => i.alt === ${JSON.stringify(BRIDGE_IMAGE.alt)})
        if (!img) return null
        const whatIs = document.getElementById("what-is").closest("section"), mission = document.getElementById("mission").closest("section")
        const after = !!(whatIs.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING), before = !!(img.compareDocumentPosition(mission) & Node.DOCUMENT_POSITION_FOLLOWING)
        const r = img.getBoundingClientRect(), wrap = img.parentElement.getBoundingClientRect()
        return { loading: img.loading, between: after && before, width: Math.round(r.width), centered: Math.abs(r.left + r.width / 2 - (wrap.left + wrap.width / 2)) <= 2 }
      })()`)
      check(`${tag}: bridge illustration between the two sections, lazy, centered, at most 720px`, !!art && art.between && art.loading === "lazy" && art.centered && art.width <= 720, art)
    }
  }

  // The hero, both buttons included, fits above the fold on common laptop screens (dark mode,
  // where the panel makes the artwork 24px taller).
  for (const [w, h] of [[1280, 800], [1440, 900]]) {
    await t.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    await t.goto("/", 400)
    const f = await t.evaluate(`(() => { const q = (s) => document.querySelector(s).getBoundingClientRect().bottom; const ctas = [...document.querySelectorAll('main a[href^="/sign-in?role="]')].map((a) => a.getBoundingClientRect().bottom); return { artBottom: Math.round(q("main h1")), everyBottom: Math.round(q("main h1 ~ p:nth-of-type(2)")), descriptionBottom: Math.round(q("main h1 ~ p:nth-of-type(4)")), ctaBottom: Math.round(Math.max(...ctas)), fold: innerHeight } })()`)
    check(`${w}x${h}: eyebrow, artwork, line, description and both buttons above the fold`, f.ctaBottom <= f.fold && f.descriptionBottom <= f.fold, f)
    await t.shot(`home-dark-fold-${w}x${h}.png`)
  }

  // Reduced motion: nothing animates.
  await t.media("dark", "reduce"); await t.size(1280); await t.goto("/", 200)
  const rm = await t.evaluate(`(() => {
    const anim = [...document.querySelectorAll(".hero-rise, .hero-fade, .hero-photo")].map((e) => getComputedStyle(e).animationName)
    return { anim: [...new Set(anim)], opacity: [...document.querySelectorAll(".hero-rise")].map((e) => getComputedStyle(e).opacity) }
  })()`)
  check("Reduced motion: no hero animation, text fully visible", rm.anim.every((a) => a === "none") && rm.opacity.every((o) => o === "1"), rm)
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
