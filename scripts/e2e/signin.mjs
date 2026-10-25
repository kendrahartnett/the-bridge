// Sign-in and the signed-in header (Phase 3): the sign-in page's structure (logo link above
// one card), text contrast for everything on it in both themes, the tabs and account-type
// cards (keyboard, chosen state, 3:1 borders), a form error, and the header's active-link
// bar and solid phone menu.
//   npm run e2e:signin

import { launchBrowser, sleep } from "./browser.mjs"
import { TEXT_CONTRAST } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { AUTH_COPY } from "../../src/lib/copy.ts"

const suite = await setup("signin")
const browser = await launchBrowser(suite)
const { check } = suite

// Contrast between two colors (CSS strings), for non-text parts such as borders and bars.
const PAIR = (fgExpr, bgExpr) => `(() => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1; const ctx = cv.getContext("2d", { willReadFrequently: true })
  const rgb = (c) => { ctx.clearRect(0,0,1,1); ctx.fillStyle = c; ctx.fillRect(0,0,1,1); return [...ctx.getImageData(0,0,1,1).data].slice(0,3) }
  const lum = (c) => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126*v[0] + 0.7152*v[1] + 0.0722*v[2] }
  const [a, b] = [lum(rgb(${fgExpr})), lum(rgb(${bgExpr}))].sort((p, q) => q - p)
  return +((a + 0.05) / (b + 0.05)).toFixed(2)
})()`

try {
  const t = await browser.newTab({ log: true })
  for (const theme of ["light", "dark"]) {
    await t.goto("/"); await t.theme(theme)
    for (const w of [320, 390, 1280]) {
      const tag = `${theme} ${w}px`
      await t.size(w)
      await t.goto("/sign-in?role=donor", 600)
      const s = await t.evaluate(`(() => {
        const main = document.querySelector("main"), card = main.querySelector(".rounded-2xl"), logo = main.querySelector('a[aria-label="The Bridge, home"]')
        const shownLogo = logo && [...logo.querySelectorAll("img")].find((i) => i.getClientRects().length)
        return {
          logoAboveCard: !!logo && !!card && logo.getBoundingClientRect().bottom <= card.getBoundingClientRect().top,
          logoWidth: Math.round(shownLogo?.getBoundingClientRect().width ?? 0),
          h1InCard: !!card?.querySelector("h1"), h1: card?.querySelector("h1")?.textContent,
          tabsInCard: !!card?.querySelector('[role=tablist]'), overflow: document.documentElement.scrollWidth > innerWidth,
          pageBg: getComputedStyle(main.parentElement).backgroundColor, bodyBg: getComputedStyle(document.body).backgroundColor,
        }
      })()`)
      check(`${tag}: logo link above one card holding the heading and tabs; deeper page color`, s.logoAboveCard && s.h1InCard && s.h1 === AUTH_COPY.heading && s.tabsInCard && s.pageBg !== s.bodyBg && s.logoWidth >= 160, s)
      check(`${tag}: no horizontal scroll`, !s.overflow)
      const a = await t.evaluate(TEXT_CONTRAST)
      check(`${tag}: all text readable on the create-account form (${a.checked} elements)`, a.failures.length === 0, a.failures.join(" | "))

      // Account-type cards: one chosen (blue outline), the other with a 3:1 border.
      const cards = await t.evaluate(`(() => {
        const radios = [...document.querySelectorAll('[role=radiogroup] [role=radio]')]
        const chosen = radios.find((r) => r.getAttribute("aria-checked") === "true"), other = radios.find((r) => r !== chosen)
        return { count: radios.length, chosen: chosen?.textContent.includes("organization"), chosenBorder: getComputedStyle(chosen).borderColor, otherBorder: getComputedStyle(other).borderColor, cardBg: getComputedStyle(chosen.closest(".rounded-2xl")).backgroundColor }
      })()`)
      const chosenRatio = await t.evaluate(PAIR(JSON.stringify(cards.chosenBorder), JSON.stringify(cards.cardBg)))
      const otherRatio = await t.evaluate(PAIR(JSON.stringify(cards.otherBorder), JSON.stringify(cards.cardBg)))
      check(`${tag}: "I'm an organization" chosen from ?role=donor; both card borders at least 3:1`, cards.count === 2 && cards.chosen && chosenRatio >= 3 && otherRatio >= 3, `chosen ${chosenRatio}:1, other ${otherRatio}:1`)
      if (w === 390 || w === 1280) await t.shot(`signin-create-${theme}-${w}.png`, { full: true })

      await t.goto("/sign-in", 600)
      const b = await t.evaluate(TEXT_CONTRAST)
      check(`${tag}: all text readable on the sign-in form (${b.checked} elements)`, b.failures.length === 0, b.failures.join(" | "))
      if (w === 390 || w === 1280) await t.shot(`signin-${theme}-${w}.png`, { full: true })
    }
  }

  // Keyboard: arrow keys move between the tabs and between the account types.
  await t.size(1280); await t.goto("/sign-in", 600)
  await t.evaluate(`document.querySelector('[role=tab][aria-selected=true]').focus(), true`)
  await t.key("ArrowRight", "ArrowRight", 39); await sleep(200)
  const tabNow = await t.evaluate(`({ focused: document.activeElement?.textContent, selected: document.querySelector('[role=tab][aria-selected=true]')?.textContent, panel: !document.getElementById("panel-create").hidden })`)
  check("Arrow Right moves to the Create account tab and shows its panel", tabNow.focused === AUTH_COPY.tabs.create && tabNow.selected === AUTH_COPY.tabs.create && tabNow.panel, tabNow)
  await t.evaluate(`document.querySelector('[role=radio][aria-checked=true]').focus(), true`)
  await t.key("ArrowRight", "ArrowRight", 39); await sleep(200)
  const typeNow = await t.evaluate(`document.querySelector('[role=radio][aria-checked=true]')?.textContent`)
  check("Arrow Right moves the account type to the other option", typeNow?.includes("organization"), typeNow)

  // A form error shows as the error notice (role=alert), readable.
  await t.goto("/sign-in", 600)
  await t.fill("#panel-sign-in", { email: "test.outreach1@example.com", password: "not-the-password" })
  await t.evaluate(`document.querySelector('#panel-sign-in button[type=submit]').click(), true`)
  await t.waitFor(`!!document.querySelector('#panel-sign-in [role=alert]')`, "sign-in error")
  const err = await t.evaluate(`document.querySelector('#panel-sign-in [role=alert]').textContent`)
  const errContrast = await t.evaluate(TEXT_CONTRAST)
  check("Wrong password shows the error notice, readable", err.includes("don't match") && errContrast.failures.length === 0, err)

  // Signed-in header: 64px from 640px, active-link bar at least 3:1, links readable, and a phone
// menu with an opaque panel (page text must never show through it).
  const s = await browser.newTab({ log: true })
  await s.signIn("test.admin@example.com")
  for (const theme of ["light", "dark"]) {
    await s.theme(theme)
    await s.size(1280); await s.goto("/admin", 800)
    const h = await s.evaluate(`(() => {
      const header = document.querySelector("header > div"), links = [...document.querySelectorAll("header nav ul:not([id]) a")]
      const cur = links.find((a) => a.getAttribute("aria-current") === "page"), bar = cur && getComputedStyle(cur, "::after")
      return { height: Math.round(header.getBoundingClientRect().height), current: cur?.textContent, barOpacity: bar?.opacity, barColor: bar?.backgroundColor, others: links.filter((a) => a !== cur).map((a) => getComputedStyle(a, "::after").opacity), headerBg: getComputedStyle(document.body).backgroundColor }
    })()`)
    const barRatio = await s.evaluate(PAIR(JSON.stringify(h.barColor), JSON.stringify(h.headerBg)))
    check(`${theme}: header 64px from 640px; Admin marked by a blue bar (${barRatio}:1), other links unmarked`, h.height === 64 && h.current === "Admin" && h.barOpacity === "1" && h.others.every((o) => o === "0") && barRatio >= 3, h)
    const hc = await s.evaluate(TEXT_CONTRAST.replace('document.querySelectorAll("body *")', 'document.querySelectorAll("header *")'))
    check(`${theme}: header text readable (${hc.checked} elements)`, hc.failures.length === 0, hc.failures.join(" | "))
    await s.shot(`header-admin-${theme}-1280.png`)

    await s.size(390); await s.goto("/dashboard", 800)
    check(`${theme}: header 56px below 640px`, (await s.evaluate(`Math.round(document.querySelector("header > div").getBoundingClientRect().height)`)) === 56)
    await s.evaluate(`document.querySelector('header button[aria-label="Menu"]').click(), true`); await sleep(400)
    await sleep(300) // let the open animation finish
    const m = await s.evaluate(`(() => { const p = document.querySelector("header nav ul[id]"); const cs = getComputedStyle(p); const cv = document.createElement("canvas").getContext("2d"); cv.fillStyle = cs.backgroundColor; cv.fillRect(0, 0, 1, 1); return { open: !p.hidden, alpha: cv.getImageData(0, 0, 1, 1).data[3], opacity: cs.opacity, current: p.querySelector('[aria-current=page]')?.textContent } })()`)
    const mc = await s.evaluate(TEXT_CONTRAST.replace('document.querySelectorAll("body *")', 'document.querySelectorAll("header nav ul[id] *")'))
    // Nothing on the page may paint over the menu: at the center of each item, the topmost
    // element must be that item.
    const onTop = await s.evaluate(`[...document.querySelectorAll("header nav ul[id] a")].map((a) => { const r = a.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return a.contains(hit) ? "ok" : a.textContent + " covered by " + hit?.tagName + " " + (hit?.textContent ?? "").trim().slice(0, 30) })`)
    check(`${theme}: phone menu items are on top of the page content`, onTop.every((x) => x === "ok"), onTop.join(" | "))
    check(`${theme}: phone menu opens as an opaque panel with Dashboard marked; text readable`, m.open && m.alpha === 255 && m.opacity === "1" && m.current === "Dashboard" && mc.failures.length === 0, { ...m, failures: mc.failures })
    await s.shot(`menu-open-${theme}-390.png`)
    await s.key("Escape", "Escape", 27)
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
