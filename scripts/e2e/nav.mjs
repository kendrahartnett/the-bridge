// Header navigation for each kind of account: Dashboard and Admin links, current-page
// marking, the phone menu (focus, Escape), 44px targets, and the admin's own dashboard.
//   npm run e2e:nav

import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("nav")
const browser = await launchBrowser(suite)
const { check } = suite

const HEADER = `(() => {
  const h = document.querySelector("header"), vw = document.documentElement.clientWidth
  const vis = (e) => e && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden"
  const inline = [...h.querySelectorAll('nav > ul:not([id]) a')].filter(vis).map(a => ({ label: a.textContent.trim(), current: a.getAttribute("aria-current"), h: Math.round(a.getBoundingClientRect().height) }))
  const menu = h.querySelector('button[aria-label="Menu"]')
  const controls = [...h.querySelectorAll("a, button")].filter(vis).map(e => e.getBoundingClientRect())
  const wm = h.querySelector("svg")
  return {
    inline,
    menu: vis(menu) ? { h: Math.round(menu.getBoundingClientRect().height), w: Math.round(menu.getBoundingClientRect().width), expanded: menu.getAttribute("aria-expanded") } : null,
    oneRow: controls.every(r => Math.abs(r.top - controls[0].top) < 8 || Math.abs(r.bottom - controls[0].bottom) < 8),
    rightEdge: Math.round(Math.max(...controls.map(r => r.right))), vw, wordmark: Math.round(wm.getBoundingClientRect().width),
    small: controls.filter(r => r.width < 44 || r.height < 44).length,
    overflow: document.documentElement.scrollWidth > vw,
  }
})()`
const MENU_ITEMS = `[...document.querySelectorAll('header nav ul[id] a')].map(a => { const r = a.getBoundingClientRect(); return { label: a.textContent.trim(), current: a.getAttribute("aria-current"), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) } })`

try {
  const users = [["outreach", "test.outreach1@example.com", false], ["approved org", "test.donor1@example.com", false], ["pending org", "test.donor3@example.com", false], ["admin", "test.admin@example.com", true]]
  const tabs = {}
  for (const [label, email] of users) { tabs[label] = await browser.newTab(); await tabs[label].signIn(email) }
  const anon = await browser.newTab()

  for (const theme of ["light", "dark"]) {
    for (const w of [1280, 320]) {
      for (const [label, , isAdmin] of users) {
        const t = tabs[label]
        await t.size(w, 800)
        await t.evaluate(`localStorage.setItem("theme", "${theme}"), true`)
        const expected = isAdmin ? ["Dashboard", "Admin"] : ["Dashboard"]
        for (const path of isAdmin ? ["/dashboard", "/admin"] : ["/dashboard"]) {
          await t.goto(path)
          const tag = `${theme} ${w}px ${label} on ${path}`
          const hd = await t.evaluate(HEADER)
          const currentLabel = path === "/admin" ? "Admin" : "Dashboard"
          if (w >= 640) {
            const ok = JSON.stringify(hd.inline.map((l) => l.label)) === JSON.stringify(expected) && hd.inline.every((l) => (l.label === currentLabel) === (l.current === "page")) && !hd.menu
            check(`${tag}: header links ${expected.join(" + ")}, current marked`, ok && hd.inline.every((l) => l.h >= 44), JSON.stringify(hd.inline))
          } else {
            check(`${tag}: links behind a 44px menu button`, hd.inline.length === 0 && hd.menu?.h >= 44 && hd.menu.w >= 44 && hd.menu.expanded === "false", JSON.stringify(hd.menu))
            await t.evaluate(`document.querySelector('header button[aria-label="Menu"]').click(), true`); await sleep(250)
            const items = await t.evaluate(MENU_ITEMS)
            const focusFirst = await t.evaluate(`document.activeElement?.textContent.trim()`)
            const expanded = await t.evaluate(`document.querySelector('header button[aria-label="Menu"]').getAttribute("aria-expanded")`)
            const okItems = JSON.stringify(items.map((i) => i.label)) === JSON.stringify(expected) && items.every((i) => (i.label === currentLabel) === (i.current === "page") && i.h >= 44 && i.left >= 0 && i.right <= w)
            check(`${tag}: menu opens with ${expected.join(" + ")}, current marked, 44px, on screen, focus on first link`, okItems && expanded === "true" && focusFirst === expected[0], JSON.stringify(items))
            if (label === "admin") await t.shot(`menu-open-${path.replace("/", "")}-320-${theme}.png`)
            await t.key("Escape", "Escape", 27); await sleep(200)
            check(`${tag}: Escape closes the menu and returns focus to the button`, await t.evaluate(`document.querySelector('header nav ul[id]').hidden && document.activeElement?.getAttribute("aria-label") === "Menu"`))
          }
          check(`${tag}: header on one row, nothing under 44px, no overflow${w === 320 ? ", wordmark 104px" : ""}`, hd.oneRow && hd.small === 0 && !hd.overflow && hd.rightEdge <= hd.vw - 16 && (w !== 320 || hd.wordmark === 104), `right edge ${hd.rightEdge}/${hd.vw}, wordmark ${hd.wordmark}`)
          if (path === "/admin") {
            const back = await t.evaluate(`(() => { const a = document.querySelector("main a"); const r = a.getBoundingClientRect(); return { text: a.textContent.trim(), href: a.getAttribute("href"), h: Math.round(r.height), first: a === document.querySelector("main").querySelector("a, h1, p") } })()`)
            check(`${tag}: "Back to dashboard" link at the top of /admin`, back.text === "← Back to dashboard" && back.href === "/dashboard" && back.h >= 44 && back.first, JSON.stringify(back))
          }
        }
      }
      await anon.size(w, 800)
      await anon.goto("/")
      check(`${theme} ${w}px signed out: no Dashboard link or menu`, !(await anon.evaluate(`!!document.querySelector('header nav') || [...document.querySelectorAll("header a")].some(a => a.textContent.trim() === "Dashboard")`)))
    }
  }

  // Item 3: the admin account keeps its normal (outreach) dashboard and abilities.
  const A = tabs.admin
  await A.size(1280, 800)
  await A.goto("/dashboard")
  const dash = await A.evaluate(`({ h2: [...document.querySelectorAll("main h2")].map(h => h.textContent), newRequest: [...document.querySelectorAll("main a")].find(a => a.getAttribute("href") === "/requests/new")?.textContent.trim(), offer: [...document.querySelectorAll("main button")].filter(b => b.textContent.trim() === "Offer support").length, banner: !!document.querySelector('[aria-label="Account status"]') })`)
  check("Admin account's dashboard is the normal outreach dashboard (Your requests + Post a Need)", JSON.stringify(dash.h2) === '["Your requests"]' && dash.newRequest === "Post a Need" && dash.offer === 0 && !dash.banner, JSON.stringify(dash))
  await A.goto("/requests/new")
  check("Admin account can open the request form, like any outreach account", await A.evaluate(`location.pathname === "/requests/new" && !!document.querySelector("main form")`))
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
