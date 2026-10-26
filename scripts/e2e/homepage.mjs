// The homepage: the stacked, centered hero (the bridge illustration, the "Every Connection"
// line as the page's h1, the lead, description and the two calls to action), no layout
// shift, the illustration served as AVIF or WebP, its size, the eyebrow under the How it
// works cards (one line), the "Bridging the Gap." artwork (one version per theme) between How
// it works and What is The Bridge?, nothing between What is The Bridge? and the Mission
// Statement, the glowing 8px cards, text contrast from real pixels, the logo's sizes, and
// reduced motion.
//   npm run e2e:homepage

import { launchBrowser, sleep } from "./browser.mjs"
import { lowestPixelContrast } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { BRIDGE_IMAGE, HERO_HEADLINE, HERO_IMAGE } from "../../src/lib/copy.ts"

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
  const section = document.querySelector("main section"), h1 = document.querySelector("main h1")
  // The hero's content container (the h1's parent; the section's first div is the background layer).
  const container = h1.parentElement, ps = container.querySelectorAll(":scope > p"), img = container.querySelector(":scope > img")
  const ctas = [...section.querySelectorAll('a[href^="/sign-in?role="]')]
  const cs = getComputedStyle(container)
  const inner = { left: container.getBoundingClientRect().left + parseFloat(cs.paddingLeft), right: container.getBoundingClientRect().right - parseFloat(cs.paddingRight) }
  return {
    h1Count: document.querySelectorAll("h1").length, h1Images: h1.querySelectorAll("img").length, h1Text: h1.textContent.trim(), heroImages: section.querySelectorAll("img").length,
    alt: img.alt, src: img.currentSrc, loading: img.loading, fetchPriority: img.fetchPriority, reserved: img.hasAttribute("width") && img.hasAttribute("height"),
    art: box(img), every: box(h1), lead: box(ps[0]), desc: box(ps[1]), ctas: ctas.map(box), ctaCount: ctas.length,
    noGlow: !section.querySelector(".hero-glow"), artPanel: getComputedStyle(img).backgroundColor,
    ctaRadius: getComputedStyle(ctas[0]).borderTopLeftRadius, ctaLabels: ctas.map((a) => a.dataset.label).join(" | "),
    cards: ["journey", "what-is", "mission"].flatMap((id) => [...document.getElementById(id).closest("section").querySelectorAll("[data-slot=card]")].map((c) => { const cs = getComputedStyle(c); return { radius: cs.borderTopLeftRadius, filter: cs.filter, top: cs.borderTopColor, left: cs.borderLeftColor, id } })),
    hasHeroEyebrow: !!section.querySelector(".hero-eyebrow"),
    pageCenter: (inner.left + inner.right) / 2, innerWidth: inner.right - inner.left, vh: innerHeight,
    noHelper: !/Request support for someone|Respond with food, clothing/.test(section.innerText),
    noArch: !section.querySelector(".arch-draw"),
    overflow: document.documentElement.scrollWidth > innerWidth,
    headerRow: (() => { const cs = [...document.querySelectorAll("header a, header button")].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect()); return cs.every((r) => Math.abs(r.top + r.height / 2 - (cs[0].top + cs[0].height / 2)) < 8) })(),
  }
})()`

// The eyebrow's text, rendered lines (of the text itself), size, spacing and overflow.
const EYEBROW = `(() => {
  const eb = document.querySelector("main .hero-eyebrow"), cs = getComputedStyle(eb), line = eb.querySelector("span")
  const steps = document.querySelector("#journey").closest("section").querySelector("ol"), r0 = eb.getBoundingClientRect(), page = document.documentElement.clientWidth
  const belowCards = !!(steps.compareDocumentPosition(eb) & Node.DOCUMENT_POSITION_FOLLOWING) && r0.top >= steps.getBoundingClientRect().bottom - 0.5 && !!eb.closest("section")?.querySelector("#journey")
  const centered = Math.abs(r0.left + r0.width / 2 - page / 2) <= 2
  const text = [...eb.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim()
  const r = document.createRange(); r.selectNodeContents([...eb.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()))
  const lines = new Set([...r.getClientRects()].map((b) => Math.round(b.top))).size
  const box = r.getBoundingClientRect()
  return { text, lines, belowCards, centered, font: cs.fontSize, tracking: cs.letterSpacing, overflow: eb.scrollWidth > eb.clientWidth + 0.5 || box.left < 15.5 || box.right > innerWidth - 15.5, lineShown: !!line && line.getClientRects().length > 0 }
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
      check(`${tag}: one h1, the text "${HERO_HEADLINE[1]}", no image inside it`, H.h1Count === 1 && H.h1Images === 0 && H.h1Text === HERO_HEADLINE[1], H)
      check(`${tag}: the hero shows only the bridge illustration (new-bridge.png), described, space reserved`, H.heroImages === 1 && H.src.includes("new-bridge") && H.alt === BRIDGE_IMAGE.alt && H.reserved, H.src.split("url=")[1]?.split("&")[0] ?? H.src)
      check(`${tag}: no text headline, gold arch connector, or CTA helper text`, H.noArch && H.noHelper)
      const order = [H.art, H.every, H.lead, H.desc].every((b, i, all) => i === 0 || b.top >= all[i - 1].bottom - 0.5) && H.ctas.every((c) => c.top >= H.desc.bottom - 0.5)
      const centered = [H.art, H.every].every((b) => Math.abs(b.center - H.pageCenter) <= 2) && Math.abs((Math.min(...H.ctas.map((c) => c.left)) + Math.max(...H.ctas.map((c) => c.right))) / 2 - H.pageCenter) <= 2
      check(`${tag}: stacked and centered: illustration, h1 line, lead, description, then the buttons; no eyebrow in the hero`, order && centered && !H.hasHeroEyebrow, { order, centered, eyebrowInHero: H.hasHeroEyebrow })
      const ratio = H.art.width / H.art.height
      if (w < 1024) check(`${tag}: illustration full container width at its own shape on phones and tablets`, Math.abs(H.art.width - H.innerWidth) <= 1 && Math.abs(ratio - 1448 / 1086) < 0.02, `${Math.round(H.art.width)} / ${Math.round(H.innerWidth)}, ratio ${ratio.toFixed(3)}`)
      else check(`${tag}: illustration height capped by the screen (at most (100svh - 13rem) x 1.15), at its own shape`, H.art.height <= (H.vh - 208) * 1.15 + 1 && H.art.width <= H.innerWidth + 0.5 && Math.abs(ratio - 1448 / 1086) < 0.02, `${Math.round(H.art.width)}x${Math.round(H.art.height)}px`)
      check(`${tag}: no glow or panel behind the illustration`, H.noGlow && H.artPanel === "rgba(0, 0, 0, 0)", H.artPanel)
      const sideBySide = Math.abs(H.ctas[0].top - H.ctas[1].top) < 1
      check(`${tag}: two buttons, 50px tall with 12px corners, labeled with an arrow, ${w >= 640 ? "side by side" : "stacked"}`, H.ctaCount === 2 && H.ctas.every((c) => Math.abs(c.height - 50) < 0.5) && H.ctaRadius === "12px" && H.ctaLabels === "Post a need → | Offer support →" && sideBySide === w >= 640, { heights: H.ctas.map((c) => Math.round(c.height)), radius: H.ctaRadius })
      check(`${tag}: How it works, What is The Bridge? and Mission Statement cards have 8px corners`, H.cards.length === 7 && H.cards.every((c) => c.radius === "8px"), H.cards.map((c) => c.radius))
      check(`${tag}: all 7 cards glow slightly blue, the Mission card keeps its gold left edge`, H.cards.every((c) => c.filter.startsWith("drop-shadow") && c.top === H.cards[0].top) && H.cards.filter((c) => c.id === "mission").every((c) => c.left !== c.top), H.cards.map((c) => `${c.id}: ${c.filter} ${c.top} / ${c.left}`))

      const eb = await t.evaluate(EYEBROW)
      check(`${tag}: eyebrow under the How it works cards, centered, on one line, no overflow (${eb.font}, letter spacing ${eb.tracking})`, eb.text === "Rooted in Chicago · Built for change" && eb.belowCards && eb.centered && eb.lines === 1 && !eb.overflow && parseFloat(eb.font) >= 10 && eb.lineShown === w >= 640, eb)

      const logo = await t.evaluate(LOGO)
      const want = w < 360 ? 100 : w < 640 ? 110 : 130
      check(`${tag}: logo ${want}px wide, the ${theme} version, decorative, link named "The Bridge, home"`, logo.shown === 1 && logo.width === want && logo.src === theme && logo.alt === "" && logo.label === "The Bridge, home", logo)

      if ([320, 390, 1280].includes(w)) {
        check(`${tag}: hero illustration loaded eagerly at high priority`, H.loading === "eager" && H.fetchPriority === "high", `${H.loading}/${H.fetchPriority}`)
        const type = t.images.filter((i) => i.url.includes("new-bridge")).at(-1)?.mimeType ?? "not loaded"
        check(`${tag}: hero illustration served as AVIF or WebP`, /image\/(avif|webp)/.test(type), type)
        await sleep(600) // let the entrance animation finish before measuring pixels
        for (const [sel, name] of [["main h1", "Every Connection line"], ["main h1 ~ p:nth-of-type(2)", "description"]]) {
          const c = await lowestPixelContrast(t, sel)
          check(`${tag}: ${name} readable (${c.need}:1 needed)`, c.worst >= c.need, `${c.worst}:1`)
        }
        await t.evaluate("scrollTo(0, 0), true"); await sleep(200)
        await t.shot(`home-${theme}-${w}.png`)
      }

      // The "Bridging the Gap." artwork between How it works and What is The Bridge?; nothing
      // between What is The Bridge? and the Mission Statement.
      const art = await t.evaluate(`(() => {
        const imgs = [...document.querySelectorAll("main img")].filter((i) => i.alt === ${JSON.stringify(HERO_IMAGE.alt)})
        const journey = document.getElementById("journey").closest("section"), whatIs = document.getElementById("what-is").closest("section"), mission = document.getElementById("mission").closest("section")
        const between = (a, b, el) => !!(a.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) && !!(el.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
        const nothingBeforeMission = ![...document.querySelectorAll("main img")].some((i) => between(whatIs, mission, i))
        const shown = imgs.filter((i) => i.getClientRects().length), img = shown[0]
        if (!img) return { count: imgs.length, shown: 0, nothingBeforeMission }
        const r = img.getBoundingClientRect(), wrap = img.parentElement, cs = getComputedStyle(wrap), inner = wrap.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
        return { count: imgs.length, shown: shown.length, src: img.currentSrc.split("url=")[1]?.split("&")[0], loading: imgs.map((i) => i.loading), between: imgs.every((i) => between(journey, whatIs, i)), width: Math.round(r.width), inner: Math.round(inner), centered: Math.abs(r.left + r.width / 2 - document.documentElement.clientWidth / 2) <= 2, nothingBeforeMission }
      })()`)
      const artFile = theme === "dark" ? "hero-light-mode" : "hero-landing-image"
      check(`${tag}: "Bridging the Gap." artwork between How it works and What is The Bridge?, the ${theme} version (${artFile}.png), lazy, centered, ${w >= 1024 ? "65% of the container, at most 898px" : "full width"}`, art.count === 2 && art.shown === 1 && art.between && !!art.src?.includes(artFile) && art.loading.every((l) => l === "lazy") && art.centered && (w >= 1024 ? Math.abs(art.width - Math.min(art.inner * 0.65, 898)) <= 1 : Math.abs(art.width - art.inner) <= 1), art)
      check(`${tag}: no image between What is The Bridge? and the Mission Statement`, art.nothingBeforeMission)
    }
  }

  // On laptop screens the artwork fills most of the hero and is fully visible; the buttons may
  // fall below the fold (where they land is reported).
  for (const [w, h] of [[1280, 800], [1440, 900]]) {
    await t.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    await t.goto("/", 400)
    const f = await t.evaluate(`(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); const ctas = [...document.querySelectorAll('main a[href^="/sign-in?role="]')].map((a) => a.getBoundingClientRect()); return { header: Math.round(q("header").bottom), artTop: Math.round(q("main section img").top), artBottom: Math.round(q("main section img").bottom), artVisibleBottom: Math.round(q("main section img").bottom - q("main section img").height * 0.046), artWidth: Math.round(q("main section img").width), h1Bottom: Math.round(q("main h1").bottom), ctaTop: Math.round(Math.min(...ctas.map((c) => c.top))), ctaBottom: Math.round(Math.max(...ctas.map((c) => c.bottom))), fold: innerHeight } })()`)
    check(`${w}x${h}: the bridge illustration starts 3% of the screen below the header and its art is fully visible (its bottom 4.6% is transparent); buttons at ${f.ctaTop}–${f.ctaBottom}px (fold ${f.fold}px)`, f.artVisibleBottom <= f.fold && f.artTop >= f.header + f.fold * 0.03 - 1 && f.artTop <= f.header + f.fold * 0.03 + 10, f)
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
