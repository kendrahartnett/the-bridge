// Spanish: the EN / ES switch, the "lang" cookie, <html lang>, the first-visit default from
// the browser's language, no English left on the main pages (apart from the allowed
// exceptions), ¿ ¡ and accents, and layout in Spanish at 320 and 390px in both themes.
//   npm run e2e:spanish

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"
import { copyFor } from "../../src/lib/copy.ts"
import { COMMUNITY_AREAS, neighborhoodLabel } from "../../src/lib/neighborhoods.ts"

const suite = await setup("spanish")
const browser = await launchBrowser(suite)
const { check, sql } = suite
const { audit } = createAudit(suite)
const en = copyFor("en"), es = copyFor("es")

// Every English string in the copy (template pieces split at {placeholders}), except those
// that are the same in Spanish (The Bridge · Chicago, EIN, https://, …).
function leaves(a, b, out = []) {
  if (typeof a === "string") {
    if (a !== b) for (const piece of a.split(/\{\w+\}/)) if (piece.trim().length >= 3) out.push(piece.trim())
  } else if (a && typeof a === "object") for (const k of Object.keys(a)) leaves(a[k], b?.[k], out)
  return out
}
const ENGLISH = [...new Set(leaves(en, es))].sort((x, y) => y.length - x.length)
// Words that only appear in English text.
const ENGLISH_WORDS = /\b(the|your|you|and|with|this|that|what|need|needs|sign|board|request|requests|organization|people|support|claim)\b/i

// Text people see or hear: visible text (screen-reader-only text included), the names and
// descriptions on controls and images, placeholders, and the tab title.
const PAGE_TEXT = `(() => [
  document.title,
  document.body.innerText,
  ...[...document.querySelectorAll("[aria-label], [title], img[alt], [placeholder]")].flatMap(e => [e.getAttribute("aria-label"), e.getAttribute("title"), e.getAttribute("alt"), e.getAttribute("placeholder")]),
].filter(Boolean).join("\\n"))()`

/**
 * English allowed to stay: what people typed (items, notes, names, organization names,
 * emails), neighborhood names, and The Bridge's name. Removed before looking for English.
 */
let allowed = []
async function loadAllowed() {
  const rows = await sql`select items as t from food_requests union select dietary_notes from food_requests union select display_name from users union select organization_name from users union select contact_name from users union select email from users union select organization_website from users`
  // The IRS's own tool is linked by its official (English) name on the admin page.
  allowed = [...rows.map((r) => r.t).filter(Boolean), ...COMMUNITY_AREAS.map(neighborhoodLabel), ...COMMUNITY_AREAS, "The Bridge", "IRS Tax Exempt Organization Search"]
    .map((a) => a.toLowerCase())
    .sort((x, y) => y.length - x.length)
}
function englishLeft(text) {
  // Compared in lowercase: some names are shown in capitals by CSS (the dashboard eyebrow).
  let rest = text.toLowerCase()
  for (const a of allowed) rest = rest.split(a).join(" ")
  const strings = ENGLISH.filter((s) => new RegExp(`(^|[^\\p{L}])${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(rest))
  const lines = rest.split("\n").filter((l) => ENGLISH_WORDS.test(l)).slice(0, 5)
  return { strings: strings.slice(0, 6), lines }
}

const LANG_STATE = `({ html: document.documentElement.lang, cookie: document.cookie.split("; ").find(c => c.startsWith("lang="))?.slice(5) ?? null, checked: [...document.querySelectorAll("[data-lang-switch] [aria-checked=true]")].find(b => b.getClientRects().length)?.textContent })`

try {
  await loadAllowed()

  // ---- 1. First visit: the browser's language decides, and is remembered ----
  const page = async (headers) => {
    const r = await fetch(`${suite.base}/`, { headers, redirect: "manual" })
    return { lang: (await r.text()).match(/<html lang="(\w+)"/)?.[1], cookie: r.headers.getSetCookie().find((c) => c.startsWith("lang=")) ?? null }
  }
  let r = await page({ "accept-language": "es-MX,es;q=0.9,en;q=0.5" })
  check("First visit, browser prefers Spanish: Spanish page, and the choice is saved for a year (SameSite=Lax)", r.lang === "es" && /^lang=es; Path=\/; Expires=.+; Max-Age=31536000; SameSite=lax$/i.test(r.cookie ?? ""), r)
  r = await page({ "accept-language": "en-US,en;q=0.9,es;q=0.8" })
  check("First visit, browser prefers English: English page", r.lang === "en" && /^lang=en;/.test(r.cookie ?? ""), r)
  r = await page({ "accept-language": "fr-FR" })
  check("First visit, any other language: English", r.lang === "en", r)
  r = await page({ "accept-language": "es", cookie: "lang=en" })
  check("A saved choice wins over the browser's language, and isn't set again", r.lang === "en" && r.cookie === null, r)
  r = await page({ cookie: "lang=es" })
  check("lang=es serves Spanish with <html lang=\"es\">", r.lang === "es", r)
  const esUrl = await fetch(`${suite.base}/es`, { headers: { cookie: "lang=es" } })
  check("There are no /es addresses (/es is the not-found page)", esUrl.status === 404)

  // ---- 2. The switch ----
  const A = await browser.newTab({ width: 1280, height: 900 })
  await A.goto("/", 800)
  let s = await A.evaluate(LANG_STATE)
  check("Default: English, EN chosen", s.html === "en" && s.checked === "EN", s)
  const SWITCH = `(() => { const g = [...document.querySelectorAll("[data-lang-switch]")].find(e => e.getClientRects().length); if (!g) return null; const radios = [...g.querySelectorAll("[role=radio]")]; return { label: g.getAttribute("aria-label"), role: g.getAttribute("role"), radios: radios.map(b => ({ name: b.getAttribute("aria-label"), text: b.textContent, checked: b.getAttribute("aria-checked"), tab: b.tabIndex, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) })), inHeader: !!g.closest("header"), besideTheme: g.nextElementSibling?.querySelector?.("svg") !== undefined } })()`
  const sw = await A.evaluate(SWITCH)
  check("The switch: a labeled radio group in the header (English, Español), one tab stop, 44px options", sw?.role === "radiogroup" && sw.label === "Language" && sw.inHeader && JSON.stringify(sw.radios.map((x) => x.name)) === '["English","Español"]' && sw.radios.filter((x) => x.tab === 0).length === 1 && sw.radios.every((x) => x.w >= 44 && x.h >= 44), sw)
  // Arrow key: focus EN, press →, the page reloads in Spanish.
  await A.evaluate(`[...document.querySelectorAll("[data-lang-switch] [aria-checked=true]")].find(b => b.getClientRects().length).focus(), true`)
  await A.evaluate(`window.__beforeSwitch = true`)
  await A.key("ArrowRight", "ArrowRight", 39)
  await A.waitFor(`!window.__beforeSwitch && document.readyState === "complete" && document.documentElement.lang === "es"`, "Spanish after the arrow key"); await sleep(600)
  s = await A.evaluate(LANG_STATE)
  check("Arrow key → ES: the page reloads in Spanish, the cookie says es, ES is chosen, same address", s.html === "es" && s.cookie === "es" && s.checked === "ES" && (await A.evaluate("location.pathname")) === "/", s)
  check("The switch is labeled in Spanish too (Idioma)", (await A.evaluate(SWITCH))?.label === es.UI.language)
  await A.reload(800)
  s = await A.evaluate(LANG_STATE)
  check("The choice persists across a reload", s.html === "es" && s.cookie === "es", s)
  await A.goto("/sign-in", 800)
  check("…and on the next page", (await A.evaluate(LANG_STATE)).html === "es")
  // Click back to English, then to Spanish for the rest.
  await A.evaluate(`window.__beforeSwitch = true; [...document.querySelectorAll("[data-lang-switch] [role=radio]")].find(b => b.textContent === "EN" && b.getClientRects().length).click(), true`)
  await A.waitFor(`!window.__beforeSwitch && document.readyState === "complete" && document.documentElement.lang === "en"`, "English after clicking EN"); await sleep(400)
  check("Clicking EN switches back to English", (await A.evaluate(LANG_STATE)).cookie === "en")
  // On phones the switch is in the menu.
  await A.size(320, 700); await A.goto("/", 800)
  const phone = await A.evaluate(`({ inline: !!document.querySelector("header > div > div > [data-lang-switch]")?.getClientRects().length, inMenu: !!document.querySelector("header nav ul[id] [data-lang-switch]") })`)
  check("At 320px the switch is in the menu, not on the header row", !phone.inline && phone.inMenu, phone)

  // ---- 3. No English left on the main pages; ¿ ¡ and accents ----
  const anon = await browser.newTab({ width: 1280, height: 900 })
  await anon.send("Network.setCookie", { name: "lang", value: "es", url: suite.base })
  const tabs = { anon }
  for (const [key, email] of [["outreach", "test.outreach1@example.com"], ["org", "test.donor1@example.com"], ["pending", "test.donor3@example.com"], ["admin", "test.admin@example.com"]]) {
    tabs[key] = await browser.newTab({ width: 1280, height: 900 })
    await tabs[key].send("Network.setCookie", { name: "lang", value: "es", url: suite.base })
    await tabs[key].signIn(email)
  }
  const PAGES = [
    ["anon", "/", "homepage"],
    ["anon", "/sign-in", "sign-in"],
    ["anon", "/sign-in?role=donor", "create account (organization)"],
    ["anon", "/sign-in?role=outreach", "create account (posting needs)"],
    ["anon", "/no-such-page", "not-found page"],
    ["outreach", "/dashboard", "dashboard (outreach) with inbox"],
    ["outreach", "/requests/new", "Post a Need"],
    ["org", "/dashboard", "dashboard (organization)"],
    ["org", "/board", "Needs Board"],
    ["org", "/requests/5eed0000-0000-4000-8000-000000000001?from=board", "a need's page (open)"],
    ["org", "/requests/5eed0000-0000-4000-8000-000000000004", "a need's page (claimed, with contact)"],
    ["pending", "/dashboard", "dashboard (pending organization)"],
    ["admin", "/admin", "admin review"],
  ]
  for (const [who, path, name] of PAGES) {
    const t = tabs[who]
    await t.size(1280, 900); await t.goto(path, 1200)
    // Open things that only show on demand: the chat panel, and every form's errors.
    if (path.startsWith("/sign-in?role=")) await t.evaluate(`document.querySelector('#panel-create button[type=submit]').click(), true`)
    if (path === "/requests/new") await t.evaluate(`document.querySelector('main form button[type=submit]').click(), true`)
    if (path === "/") await t.evaluate(`document.querySelector("[data-assistant-launcher]")?.click(), true`)
    await sleep(500)
    const text = await t.evaluate(PAGE_TEXT)
    const left = englishLeft(text)
    check(`ES · ${name}: no English left (apart from people's own text, names, neighborhoods, The Bridge)`, left.strings.length === 0 && left.lines.length === 0, left)
    check(`ES · ${name}: <html lang="es">`, (await t.evaluate("document.documentElement.lang")) === "es")
  }
  await anon.goto("/", 800)
  const glyphs = await anon.evaluate(`(() => { const t = document.body.innerText; const fonts = [...new Set([...document.querySelectorAll("h1, h2, p, button")].map(e => { const cs = getComputedStyle(e); return cs.fontWeight + " 16px " + cs.fontFamily.split(",")[0] }))]; return { marks: ["¿", "ó", "í"].filter(c => t.includes(c)), fonts: fonts.map(f => [f.split(",")[0], document.fonts.check(f, "¿¡áéíóúüñÁÉÍÓÚÑ")]) } })()`)
  check("¿ and accented letters are on the page, and every font in use has them (¿ ¡ á é í ó ú ü ñ)", glyphs.marks.length === 3 && glyphs.fonts.every(([, ok]) => ok), glyphs)
  // Spanish dates: the board's time windows and the timeline.
  await tabs.org.goto("/requests/5eed0000-0000-4000-8000-000000000004", 1000)
  const when = await tabs.org.evaluate(`[...document.querySelectorAll("time")].map(t => t.textContent)`)
  check("Dates and times use the Spanish format", when.length > 0 && when.every((x) => /\b(ene|feb|mar|abr|may|jun|jul|ago|sept?|oct|nov|dic)\b/i.test(x) && /(a|p)\.\s?m\./.test(x)), when)

  // ---- 4. Layout in Spanish at 320 and 390px, both themes ----
  const LAYOUT = [
    ["anon", "/", "homepage"], ["anon", "/sign-in", "sign-in"], ["anon", "/sign-in?role=donor", "create account"],
    ["outreach", "/dashboard", "dashboard (outreach)"], ["outreach", "/requests/new", "Post a Need"],
    ["org", "/dashboard", "dashboard (organization)"], ["org", "/board", "Needs Board"],
    ["org", "/requests/5eed0000-0000-4000-8000-000000000004", "need page"], ["pending", "/dashboard", "dashboard (pending)"],
    ["admin", "/admin", "admin"],
  ]
  const ONE_LINE = `(() => {
    const lines = (e) => { const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(b => b.width > 1).map(b => Math.round(b.top))).size }
    const eyebrow = document.querySelector(".hero-eyebrow")
    const badges = [...document.querySelectorAll("[data-slot=badge], [data-note-badge], [data-note-stamp]")].filter(b => b.getClientRects().length)
    // The site header (a page's own <header> with its back link is part of the page). The
    // sign-in page has none; its top row is checked instead.
    const site = document.querySelector("header.glass") ?? document.querySelector("main > div")
    const header = [...site.querySelectorAll("a, button, [role=radio]")].filter(e => e.getClientRects().length).map(e => e.getBoundingClientRect())
    return {
      eyebrow: eyebrow ? lines(eyebrow) : null,
      badges: badges.filter(b => lines(b) > 1).map(b => b.textContent),
      headerRow: header.every(r => Math.abs(r.top + r.height / 2 - (header[0].top + header[0].height / 2)) < 8),
      headerFits: Math.max(...header.map(r => r.right)) <= document.documentElement.clientWidth - 15,
    }
  })()`
  for (const theme of ["light", "dark"]) {
    for (const t of Object.values(tabs)) { await t.goto("/"); await t.theme(theme) }
    for (const w of [320, 390]) {
      for (const [who, path, name] of LAYOUT) {
        const t = tabs[who]
        await t.size(w, 844); await t.goto(path, 1200)
        await audit(t, `ES · ${name}`, w, theme)
        const o = await t.evaluate(ONE_LINE)
        check(`ES · ${name} · ${theme} ${w}px: header on one row and on screen; badges on one line${o.eyebrow !== null ? "; eyebrow on one line" : ""}`, o.headerRow && o.headerFits && o.badges.length === 0 && (o.eyebrow === null || o.eyebrow === 1), o)
      }
    }
  }

  // Wider screens: the signed-in header (links, bell, language switch, theme, Salir) still
  // fits on one row in Spanish, for each account.
  for (const w of [640, 768, 1024, 1280]) {
    for (const who of ["outreach", "org", "admin"]) {
      const t = tabs[who]
      await t.size(w, 900); await t.goto("/dashboard", 1000)
      const o = await t.evaluate(ONE_LINE)
      check(`ES · header (${who}) at ${w}px: one row, on screen`, o.headerRow && o.headerFits, o)
    }
  }

  // The homepage buttons keep their 50px height (one line) with the longer Spanish labels.
  for (const w of [640, 1024, 1280]) {
    await anon.size(w, 900); await anon.goto("/", 1000)
    const ctas = await anon.evaluate(`[...document.querySelectorAll('main a[href^="/sign-in?role="]')].map(a => ({ text: a.textContent, h: Math.round(a.getBoundingClientRect().height), w: Math.round(a.getBoundingClientRect().width) }))`)
    check(`ES · homepage ${w}px: both buttons on one line (50px), the same width`, ctas.length === 2 && ctas.every((c) => c.h === 50) && ctas[0].w === ctas[1].w, ctas)
  }

  // ---- 5. Screenshots: homepage and Needs Board in Spanish, dark, 390 and 1280px ----
  for (const t of [anon, tabs.org]) { await t.goto("/"); await t.theme("dark") }
  for (const w of [390, 1280]) {
    await anon.size(w, w < 640 ? 844 : 900); await anon.goto("/", 1500)
    await anon.shot(`home-es-dark-${w}.png`, { full: true })
    await tabs.org.size(w, w < 640 ? 844 : 900); await tabs.org.goto("/board", 1500)
    await tabs.org.shot(`board-es-dark-${w}.png`, { full: true })
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
