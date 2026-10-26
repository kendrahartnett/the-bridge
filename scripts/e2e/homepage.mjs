// The homepage: the stacked, centered hero (the headline artwork as the page's h1, one
// version per theme with nothing behind it, then the line, description and the two calls to
// action), no layout shift, the artwork served as AVIF or WebP, its size,
// the eyebrow moved under the How it works cards (one line), the illustration between "What
// is The Bridge?" and the Mission Statement, text contrast from real pixels, the logo's
// sizes, and reduced motion.
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
  const section = document.querySelector("main section"), h1 = document.querySelector("main h1")
  const imgs = [...h1.querySelectorAll("img")], img = imgs.find((i) => i.getClientRects().length) ?? imgs[0]
  // The hero's content container (the h1's parent; the section's first div is the background layer).
  const container = h1.parentElement, ps = container.querySelectorAll(":scope > p")
  const ctas = [...section.querySelectorAll('a[href^="/sign-in?role="]')]
  const cs = getComputedStyle(container)
  const inner = { left: container.getBoundingClientRect().left + parseFloat(cs.paddingLeft), right: container.getBoundingClientRect().right - parseFloat(cs.paddingRight) }
  return {
    h1Count: document.querySelectorAll("h1").length, h1Images: imgs.length, visibleImages: imgs.filter((i) => i.getClientRects().length).length, h1Text: h1.textContent.trim(),
    alt: img.alt, allAlts: imgs.every((i) => i.alt === img.alt), src: img.currentSrc, loading: img.loading, fetchPriority: img.fetchPriority,
    reserved: getComputedStyle(h1).aspectRatio !== "auto" && h1.getBoundingClientRect().height > 0, frameRatio: h1.getBoundingClientRect().width / h1.getBoundingClientRect().height,
    art: box(h1), every: box(ps[0]), lead: box(ps[1]), desc: box(ps[2]), ctas: ctas.map(box), ctaCount: ctas.length,
    noGlow: !section.querySelector(".hero-glow") && h1.children.length === imgs.length,
    ctaRadius: getComputedStyle(ctas[0]).borderTopLeftRadius,
    cardRadii: ["journey", "what-is", "mission"].flatMap((id) => [...document.getElementById(id).closest("section").querySelectorAll("[data-slot=card]")].map((c) => getComputedStyle(c).borderTopLeftRadius)),
    hasHeroEyebrow: !!section.querySelector(".hero-eyebrow"),
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
      check(`${tag}: one h1, holding only the headline artwork (one version shown), alt text "${HERO_IMAGE.alt}", space reserved`, H.h1Count === 1 && H.h1Images === 2 && H.visibleImages === 1 && H.h1Text === "" && H.alt === HERO_IMAGE.alt && H.allAlts && H.reserved, H)
      const artFile = theme === "dark" ? "hero-light-mode" : "hero-landing-image"
      check(`${tag}: the ${theme}-mode artwork (${artFile}.png) is the one shown`, H.src.includes(artFile), H.src.split("url=")[1]?.split("&")[0] ?? H.src)
      check(`${tag}: no text headline, gold arch connector, or CTA helper text`, H.noArch && H.noHelper)
      const order = [H.art, H.every, H.lead, H.desc].every((b, i, all) => i === 0 || b.top >= all[i - 1].bottom - 0.5) && H.ctas.every((c) => c.top >= H.desc.bottom - 0.5)
      const centered = [H.art, H.every].every((b) => Math.abs(b.center - H.pageCenter) <= 2) && Math.abs((Math.min(...H.ctas.map((c) => c.left)) + Math.max(...H.ctas.map((c) => c.right))) / 2 - H.pageCenter) <= 2
      check(`${tag}: stacked and centered: artwork, line, lead, description, then the buttons; no eyebrow in the hero`, order && centered && !H.hasHeroEyebrow, { order, centered, eyebrowInHero: H.hasHeroEyebrow })
      if (w < 1024) check(`${tag}: artwork full container width at its own shape on phones and tablets`, Math.abs(H.art.width - H.innerWidth) <= 1 && Math.abs(H.frameRatio - 1672 / 941) < 0.02, `${Math.round(H.art.width)} / ${Math.round(H.innerWidth)}, ratio ${H.frameRatio.toFixed(3)}`)
      else check(`${tag}: artwork frame 8% wider than the artwork's shape (1.919), at most 1382px`, H.art.width <= 1382.5 && H.art.width <= H.innerWidth + 0.5 && H.art.width >= 700 && Math.abs(H.frameRatio - 1.919) < 0.02, `${Math.round(H.art.width)}px of ${Math.round(H.innerWidth)}px, ratio ${H.frameRatio.toFixed(3)}`)
      check(`${tag}: no glow or anything else behind the artwork`, H.noGlow)
      const sideBySide = Math.abs(H.ctas[0].top - H.ctas[1].top) < 1
      check(`${tag}: two slim buttons, 40px tall with 8px corners, ${w >= 640 ? "side by side" : "stacked"}`, H.ctaCount === 2 && H.ctas.every((c) => Math.abs(c.height - 40) < 0.5) && H.ctaRadius === "8px" && sideBySide === w >= 640, { heights: H.ctas.map((c) => Math.round(c.height)), radius: H.ctaRadius })
      check(`${tag}: How it works, What is The Bridge? and Mission Statement cards have 8px corners`, H.cardRadii.length === 7 && H.cardRadii.every((r) => r === "8px"), H.cardRadii)
      check(`${tag}: no panel or background behind the headline artwork`, H.artPanel === "rgba(0, 0, 0, 0)", H.artPanel)

      const eb = await t.evaluate(EYEBROW)
      check(`${tag}: eyebrow under the How it works cards, centered, on one line, no overflow (${eb.font}, letter spacing ${eb.tracking})`, eb.text === "Rooted in Chicago · Built for change" && eb.belowCards && eb.centered && eb.lines === 1 && !eb.overflow && parseFloat(eb.font) >= 10 && eb.lineShown === w >= 640, eb)

      const logo = await t.evaluate(LOGO)
      const want = w < 360 ? 100 : w < 640 ? 110 : 130
      check(`${tag}: logo ${want}px wide, the ${theme} version, decorative, link named "The Bridge, home"`, logo.shown === 1 && logo.width === want && logo.src === theme && logo.alt === "" && logo.label === "The Bridge, home", logo)

      if ([320, 390, 1280].includes(w)) {
        check(`${tag}: headline artwork loaded eagerly at high priority`, H.loading === "eager" && H.fetchPriority === "high", `${H.loading}/${H.fetchPriority}`)
        const type = t.images.filter((i) => i.url.includes(theme === "dark" ? "hero-light-mode" : "hero-landing-image")).at(-1)?.mimeType ?? "not loaded"
        check(`${tag}: headline artwork served as AVIF or WebP`, /image\/(avif|webp)/.test(type), type)
        await sleep(600) // let the entrance animation finish before measuring pixels
        for (const [sel, name] of [["main h1 ~ p:nth-of-type(1)", "Every Connection line"], ["main h1 ~ p:nth-of-type(3)", "description"]]) {
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
      check(`${tag}: bridge illustration between the two sections, lazy, centered, at most 662px`, !!art && art.between && art.loading === "lazy" && art.centered && art.width <= 662, art)
    }
  }

  // On laptop screens the artwork fills most of the hero and is fully visible; the buttons may
  // fall below the fold (where they land is reported).
  for (const [w, h] of [[1280, 800], [1440, 900]]) {
    await t.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    await t.goto("/", 400)
    const f = await t.evaluate(`(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); const ctas = [...document.querySelectorAll('main a[href^="/sign-in?role="]')].map((a) => a.getBoundingClientRect()); return { artTop: Math.round(q("main h1").top), artBottom: Math.round(q("main h1").bottom), artWidth: Math.round(q("main h1").width), leadBottom: Math.round(q("main h1 ~ p:nth-of-type(2)").bottom), ctaTop: Math.round(Math.min(...ctas.map((c) => c.top))), ctaBottom: Math.round(Math.max(...ctas.map((c) => c.bottom))), fold: innerHeight } })()`)
    check(`${w}x${h}: the artwork is fully visible; buttons at ${f.ctaTop}–${f.ctaBottom}px (fold ${f.fold}px)`, f.artBottom <= f.fold && f.artTop <= 90, f)
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
