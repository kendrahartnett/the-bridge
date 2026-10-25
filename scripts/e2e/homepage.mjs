// The homepage hero and logo: reading order on phones (headline and both calls to action
// before the image), no layout shift, the image served as AVIF or WebP and never cropped,
// its alt text, the desktop layout (image top level with the eyebrow, the gold arch meeting
// the image's edge, the secondary line on one line), the headline font, text contrast
// from real pixels, the logo's sizes and accessible name, and reduced motion.
//   npm run e2e:homepage

import { launchBrowser, sleep } from "./browser.mjs"
import { lowestPixelContrast } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { HERO_IMAGE } from "../../src/lib/copy.ts"

const suite = await setup("homepage")
const browser = await launchBrowser(suite)
const { check } = suite

// Layout shift over the page's first 2.5 seconds (CLS: sum of shifts not caused by input).
const CLS = `new Promise((resolve) => {
  let cls = 0
  new PerformanceObserver((list) => { for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value }).observe({ type: "layout-shift", buffered: true })
  setTimeout(() => resolve(+cls.toFixed(4)), 2500)
})`

const LAYOUT = `(() => {
  const box = (el) => { const r = el.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY, left: r.left, right: r.right, width: r.width, height: r.height } }
  const h1 = document.querySelector("main h1"), lines = h1.querySelectorAll(":scope > span")
  const frame = document.querySelector("main section img").parentElement
  const img = frame.querySelector("img"), eyebrow = document.querySelector("main section p")
  const arch = [...h1.querySelectorAll("svg")].find((s) => s.getClientRects().length)
  const ctas = [...document.querySelectorAll('main a[href^="/sign-in?role="]')]
  const sub = lines[1], subStyle = getComputedStyle(sub), headStyle = getComputedStyle(lines[0])
  return {
    h1: box(h1), frame: box(frame), eyebrow: box(eyebrow), arch: arch && box(arch),
    ctaBottoms: ctas.map((a) => Math.round(box(a).bottom)), ctaCount: ctas.length,
    imgNatural: img.naturalWidth / img.naturalHeight, frameRatio: box(frame).width / box(frame).height,
    headFont: headStyle.fontFamily, headSize: parseFloat(headStyle.fontSize), subSize: parseFloat(subStyle.fontSize),
    headLines: Math.round(lines[0].querySelector("span").getBoundingClientRect().height / parseFloat(headStyle.lineHeight)),
    headRight: lines[0].querySelector("span").getBoundingClientRect().right, columnRight: h1.parentElement.getBoundingClientRect().right,
    objectX: parseFloat(getComputedStyle(img).objectPosition) / 100,
    headerRow: (() => { const cs = [...document.querySelectorAll("header a, header button")].filter((e) => e.getClientRects().length).map((e) => e.getBoundingClientRect()); return cs.every((r) => Math.abs(r.top + r.height / 2 - (cs[0].top + cs[0].height / 2)) < 8) })(),
    subLines: Math.round(sub.getBoundingClientRect().height / parseFloat(subStyle.lineHeight)),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }
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
    const headSizes = []
    for (const w of [320, 390, 768, 1024, 1280, 1440]) {
      const tag = `${theme} ${w}px`
      await t.size(w)
      await t.send("Network.setCacheDisabled", { cacheDisabled: true })
      await t.goto("/", 300)
      const cls = await t.evaluate(CLS)
      check(`${tag}: layout shift under 0.02`, cls < 0.02, `CLS ${cls}`)

      const L = await t.evaluate(LAYOUT)
      headSizes.push([w, L.headSize])
      check(`${tag}: no horizontal overflow`, !L.overflow)
      check(`${tag}: header on one row`, L.headerRow)
      if (w < 1024) check(`${tag}: image shown whole (frame matches the image's 4:3 shape, nothing cropped)`, Math.abs(L.frameRatio - L.imgNatural) < 0.02, `${L.frameRatio.toFixed(3)} vs ${L.imgNatural.toFixed(3)}`)
      else {
        // Visible share of the image's width, and where it starts (object-position x).
        const shown = L.frameRatio / L.imgNatural, from = L.objectX * (1 - shown), to = from + shown
        check(`${tag}: 7:6 crop keeps the whole bridge (2%–86% across) and both figures (30%, 72%) in view`, Math.abs(L.frameRatio - 7 / 6) < 0.02 && from <= 0.02 && to >= 0.86, `shows ${(from * 100).toFixed(1)}%–${(to * 100).toFixed(1)}% of the width`)
      }
      if (w >= 768) check(`${tag}: "Bridging the Gap." on one line, inside its column`, L.headLines === 1 && L.headRight <= L.columnRight + 0.5, `${L.headLines} line(s), ends ${L.headRight.toFixed(0)} / column ${L.columnRight.toFixed(0)}`)
      check(`${tag}: headline in Zen Tokyo Zoo, at least 36px, larger than the secondary line`, /Zen Tokyo Zoo/.test(L.headFont) && L.headSize >= 36 && L.headSize > L.subSize * 1.4, `${L.headSize}px vs ${L.subSize}px`)
      if (w < 1024) check(`${tag}: headline and both calls to action come before the image`, L.ctaCount === 2 && L.h1.bottom <= L.frame.top && L.ctaBottoms.every((y) => y <= L.frame.top), L)
      if (w >= 1024) {
        check(`${tag}: image top level with the eyebrow line`, Math.abs(L.frame.top - L.eyebrow.top) <= 4, `${Math.round(L.frame.top)} vs ${Math.round(L.eyebrow.top)}`)
        check(`${tag}: gold arch meets the image's edge without overlapping it`, !!L.arch && L.arch.right <= L.frame.left + 0.5 && L.frame.left - L.arch.right <= 4 && L.arch.width > 40, L.arch && `arch ends ${L.arch.right.toFixed(1)}, image starts ${L.frame.left.toFixed(1)}, arch ${Math.round(L.arch.width)}px`)
        check(`${tag}: "Every Connection is a Step Forward." on one line`, L.subLines === 1, `${L.subLines} lines`)
      }

      const logo = await t.evaluate(LOGO)
      const want = w < 360 ? 116 : w < 640 ? 128 : 152
      check(`${tag}: logo ${want}px wide, the ${theme} version, decorative, link named "The Bridge, home"`, logo.shown === 1 && logo.width === want && logo.src === theme && logo.alt === "" && logo.label === "The Bridge, home", logo)

      if ([320, 390, 1280].includes(w)) {
        const alt = await t.evaluate(`document.querySelector("main section img").alt`)
        check(`${tag}: image alt text exact`, alt === HERO_IMAGE.alt, alt)
        // The type the browser actually received (not a script fetch, which sends a different Accept header).
        const img = await t.evaluate(`(() => { const i = document.querySelector("main section img"); return { loading: i.loading, fetchPriority: i.fetchPriority } })()`)
        const type = t.images.filter((i) => i.url.includes("hero-bridge")).at(-1)?.mimeType ?? "not loaded"
        check(`${tag}: image served as AVIF or WebP, loaded eagerly at high priority`, /image\/(avif|webp)/.test(type) && img.loading === "eager" && img.fetchPriority === "high", `${type}; ${img.loading}/${img.fetchPriority}`)
        await sleep(600) // let the entrance animation finish before measuring pixels
        const head = await lowestPixelContrast(t, "main h1 > span:first-child")
        check(`${tag}: headline stripes readable against the background (${head.need}:1 needed)`, head.worst >= head.need, `${head.worst}:1 (${head.name})`)
        for (const id of ["cta-post-help", "cta-respond-help"]) {
          const size = await t.evaluate(`parseFloat(getComputedStyle(document.getElementById("${id}")).fontSize)`)
          const help = await lowestPixelContrast(t, `#${id}`)
          check(`${tag}: CTA help text ${id.split("-")[1]} is 14px and at least 4.5:1`, size === 14 && help.worst >= 4.5, `${size}px, ${help.worst}:1`)
        }
        const sub = await lowestPixelContrast(t, "main h1 > span:last-child")
        check(`${tag}: secondary line readable (${sub.need}:1 needed at its size)`, sub.worst >= sub.need, `${sub.worst}:1`)
        await t.evaluate("scrollTo(0, 0), true"); await sleep(200)
        await t.shot(`home-${theme}-${w}.png`)
      }
    }
    // From 768px the headline never gets smaller as the screen gets wider.
    const fromTablet = headSizes.filter(([w]) => w >= 768)
    check(`${theme}: headline size never shrinks from 768px up`, fromTablet.every(([, px], i) => i === 0 || px >= fromTablet[i - 1][1] - 0.01), fromTablet.map(([w, px]) => `${w}: ${px.toFixed(1)}px`).join(", "))
  }

  // Reduced motion: nothing animates and the arch is already complete.
  await t.media("dark", "reduce"); await t.size(1280); await t.goto("/", 200)
  const rm = await t.evaluate(`(() => {
    const anim = [...document.querySelectorAll(".hero-rise, .hero-fade, .hero-photo, .arch-draw")].map((e) => getComputedStyle(e).animationName)
    const arch = document.querySelector(".arch-draw")
    return { anim: [...new Set(anim)], dash: arch && getComputedStyle(arch).strokeDashoffset, opacity: [...document.querySelectorAll(".hero-rise")].map((e) => getComputedStyle(e).opacity) }
  })()`)
  check("Reduced motion: no hero animation, arch complete, text fully visible", rm.anim.every((a) => a === "none") && /^0(px)?$/.test(rm.dash) && rm.opacity.every((o) => o === "1"), rm)
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
