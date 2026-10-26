// The Needs Board (/board) and each need's page (/requests/[id]):
//   - who may open them: every test account and a signed-out visitor, with the HTTP status,
//     the emails in the page HTML (which also carries the server payload), and what each one
//     can do; everyone else gets the same not-found page with a real 404;
//   - the sticky notes: order, text clear of the adhesive strip and the curled corner, long
//     items cut at 3 lines, the "Claimed" stamp only on In Progress notes, "Your post", the
//     same tilt on every load, text contrast from real pixels;
//   - keyboard: Tab through the notes (focus ring on each), Enter opens one, the back link;
//   - the board and a need's page in both themes at 320, 390, 1024 and 1280px: no overflow,
//     44px targets, contrast, and no motion with reduced motion;
//   - the inbox and the header bell: unread count (9+), what opening a notification does,
//     Mark all as read, the empty state, a new claim showing up on the next page load, and
//     the inbox in both themes at the same widths.
// Adds a few tagged needs on the-bridge-dev so the board is full, and deletes exactly those
// at the end (the harness then reseeds the rest).
//   npm run e2e:board

import { createAudit } from "./audit.mjs"
import { launchBrowser, sleep } from "./browser.mjs"
import { lowestPixelContrast, TEXT_CONTRAST } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { BOARD_COPY, DETAIL_COPY, INBOX_COPY, NOT_FOUND_COPY, VERIFICATION_COPY } from "../../src/lib/copy.ts"

const suite = await setup("board")
const browser = await launchBrowser(suite)
const { check, sql } = suite
const { audit } = createAudit(suite)

const EMAIL = {
  outreach1: "test.outreach1@example.com", outreach2: "test.outreach2@example.com",
  donor1: "test.donor1@example.com", donor2: "test.donor2@example.com", donor3: "test.donor3@example.com",
  admin: "test.admin@example.com",
}
const ALL_EMAILS = Object.values(EMAIL)
// The seeded needs: R1 open (outreach1), R4 In Progress (outreach2, claimed by donor1),
// R5 Fulfilled (outreach1, claimed by donor2), R6 Cancelled (outreach2).
const R = {
  R1: "5eed0000-0000-4000-8000-000000000001",
  R4: "5eed0000-0000-4000-8000-000000000004",
  R5: "5eed0000-0000-4000-8000-000000000005",
  R6: "5eed0000-0000-4000-8000-000000000006",
  missing: "5eed0000-0000-4000-8000-0000000000ff",
  garbage: "not-a-need",
}

// Where the note's paper, adhesive strip and curled corner are, as fractions of its width
// (the image is square). Measured from public/images/sticky-note-card.png.
const ZONES = { paper: { left: 0.064, top: 0.085, right: 0.939, bottom: 0.925 }, stripBottom: 0.175, curl: { left: 0.85, top: 0.85 } }

const TAG = "[e2e-board]"
const LONG = "Warm socks, gloves, and hats in adult sizes, plus a few pairs of waterproof boots, sizes 9 to 12, and rain ponchos for the whole team if anyone has spares to donate"
const added = []

/** Status and HTML of a page, fetched from the tab (so with its session). */
const fetchPage = (t, path) => t.evaluate(`fetch(${JSON.stringify(path)}, { cache: "no-store" }).then(async r => ({ status: r.status, html: await r.text() }))`)
/** The <main> of an HTML document, for comparing not-found pages. */
const mainOf = (t, html) => t.evaluate(`new DOMParser().parseFromString(${JSON.stringify(html)}, "text/html").querySelector("main")?.outerHTML ?? ""`)

try {
  // ---- Extra needs, so the board has more than 6 notes ----
  const ids = Object.fromEntries((await sql`select email, id from users where email like 'test.%@example.com'`).map((r) => [r.email, r.id]))
  const extras = [
    [EMAIL.outreach1, 12, "food", "Sandwiches and bottled water for an evening outreach shift", "Logan Square", 2, null],
    [EMAIL.outreach2, 8, "clothing", LONG, "Uptown", 3, null],
    [EMAIL.donor1, 30, "hygiene", "Feminine hygiene products", "Austin", 4, null],
    [EMAIL.outreach2, 5, "other", "Sleeping bags", "Rogers Park", 5, EMAIL.donor2],
  ]
  for (const [by, n, category, items, hood, days, claimer] of extras) {
    const [row] = await sql`insert into food_requests (created_by, people_count, category, items, neighborhood, window_start, window_end, status, claimed_by, claimed_at)
      values (${ids[by]}, ${n}, ${category}, ${`${TAG} ${items}`}, ${hood}, now() + ${`${days} days`}::interval, now() + ${`${days} days`}::interval + interval '2 hours',
        ${claimer ? "claimed" : "open"}, ${claimer ? ids[claimer] : null}, ${claimer ? new Date() : null}) returning id`
    added.push(row.id)
  }
  const [, longId, ownId] = added

  // ---- 1. Access: the board and each need's page, for every account ----
  const tabs = {}
  for (const [key, email] of Object.entries(EMAIL)) { tabs[key] = await browser.newTab({ width: 1280, height: 900 }); await tabs[key].signIn(email) }
  tabs.anon = await browser.newTab({ width: 1280, height: 900 }); await tabs.anon.goto("/")
  const notFoundMain = await mainOf(tabs.anon, (await fetchPage(tabs.anon, "/no-such-page")).html)
  check("The not-found page is the illustrated one", notFoundMain.includes(NOT_FOUND_COPY.title))

  // [page, { viewer: emails that may appear }]; a viewer not listed gets the 404.
  const ACCESS = [
    ["/board", { donor1: [], donor2: [], donor3: [] }],
    [`/requests/${R.R1}`, { outreach1: [], donor1: [], donor2: [], donor3: [] }],
    [`/requests/${R.R4}`, { outreach2: [EMAIL.donor1], donor1: [EMAIL.outreach2], donor2: [], donor3: [] }],
    [`/requests/${R.R5}`, { outreach1: [EMAIL.donor2], donor2: [EMAIL.outreach1] }],
    [`/requests/${R.R6}`, { outreach2: [] }],
    [`/requests/${R.missing}`, {}],
    [`/requests/${R.garbage}`, {}],
  ]
  for (const [path, allowed] of ACCESS) {
    for (const viewer of ["outreach1", "outreach2", "donor1", "donor2", "donor3", "admin", "anon"]) {
      const { status, html } = await fetchPage(tabs[viewer], path)
      const own = EMAIL[viewer]
      const emails = ALL_EMAILS.filter((e) => e !== own && html.includes(e)).sort()
      if (viewer in allowed) {
        const want = [...allowed[viewer]].sort()
        check(`${viewer} · ${path}: allowed (200); emails in the HTML: ${want.join(", ") || "none"}`, status === 200 && JSON.stringify(emails) === JSON.stringify(want), `HTTP ${status}; emails ${emails.join(", ") || "none"}`)
      } else {
        const same = (await mainOf(tabs[viewer], html)) === notFoundMain
        check(`${viewer} · ${path}: the standard not-found page, HTTP 404, no emails`, status === 404 && same && emails.length === 0, `HTTP ${status}; identical: ${same}; emails ${emails.join(", ") || "none"}`)
      }
    }
  }

  // ---- 2. What each viewer sees on a need's page ----
  const VIEW = `(() => {
    const m = document.querySelector("main")
    return {
      text: m.innerText, buttons: [...m.querySelectorAll("button")].map(b => b.textContent.trim()),
      back: (() => { const a = m.querySelector("article > a"); return a && { text: a.textContent.trim(), href: a.getAttribute("href") } })(),
      mailto: [...m.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute("href").slice(7)),
      steps: [...m.querySelectorAll("[data-step]")].map(s => s.dataset.step + ":" + s.innerText.replace(/\\n/g, " ")),
    }
  })()`
  const see = async (who, path) => { await tabs[who].goto(path, 900); return tabs[who].evaluate(VIEW) }
  let v = await see("donor1", `/requests/${R.R1}?from=board`)
  check("Approved organization, open need: Claim this need, \"Contact info appears after you claim.\", back to the Needs Board", v.buttons.includes("Claim this need") && v.text.includes(DETAIL_COPY.contactAfterClaim) && v.mailto.length === 0 && v.back?.href === "/board" && v.back.text === DETAIL_COPY.backToBoard, v.back)
  v = await see("donor1", `/requests/${R.R1}`)
  check("Opened from anywhere else, the back link goes to the dashboard", v.back?.href === "/dashboard" && v.back.text === DETAIL_COPY.backToDashboard, v.back)
  check("Timeline on an open need: Posted with a time, Claimed and Fulfilled not yet", v.steps.length === 3 && v.steps[0].startsWith("done:Posted") && /\d{4}/.test(v.steps[0]) && v.steps.slice(1).every((s) => s.startsWith("ahead:") && s.includes(DETAIL_COPY.notYet)), v.steps)
  v = await see("donor3", `/requests/${R.R1}?from=board`)
  check("Pending organization, open need: \"Available after approval.\", no button, no contact", !v.buttons.includes("Claim this need") && v.text.includes(VERIFICATION_COPY.availableAfterApproval) && v.mailto.length === 0)
  v = await see("donor2", `/requests/${R.R4}?from=board`)
  check("Another organization, In Progress need: \"Claimed by another organization.\", no button, no contact", v.text.includes(DETAIL_COPY.claimedByOther) && v.buttons.length === 0 && v.mailto.length === 0)
  v = await see("donor1", `/requests/${R.R4}`)
  check("The organization that claimed it: poster's name and email, the handoff note", JSON.stringify(v.mailto) === JSON.stringify([EMAIL.outreach2]) && v.text.includes("Posted by Test — West Side Street Team") && v.text.includes("Use this to arrange the handoff."), v.mailto)
  check("Timeline on an In Progress need: Posted and Claimed with times, Fulfilled not yet", v.steps.length === 3 && v.steps[1].startsWith("done:Claimed") && /\d{4}/.test(v.steps[1]) && v.steps[2].startsWith("ahead:Fulfilled"), v.steps)
  v = await see("outreach2", `/requests/${R.R4}`)
  check("Poster, In Progress need: Mark fulfilled and the claiming organization's contact", v.buttons.includes("Mark fulfilled") && JSON.stringify(v.mailto) === JSON.stringify([EMAIL.donor1]) && v.back?.href === "/dashboard", v.buttons)
  v = await see("outreach1", `/requests/${R.R1}?from=board`)
  check("Poster, open need: Cancel, no contact; an outreach account's back link goes to the dashboard", v.buttons.includes("Cancel") && v.mailto.length === 0 && v.back?.href === "/dashboard", v.buttons)
  v = await see("outreach1", `/requests/${R.R5}`)
  check("Timeline on a Fulfilled need: Posted, Claimed and Fulfilled, each with a time", v.steps.length === 3 && v.steps.every((s) => s.startsWith("done:") && /\d{4}/.test(s)), v.steps)
  v = await see("outreach2", `/requests/${R.R6}`)
  check("Timeline on a Cancelled need: Posted, then Cancelled with a time", v.steps.length === 2 && v.steps[1].startsWith("done:Cancelled") && /\d{4}/.test(v.steps[1]), v.steps)

  // ---- 3. The board's notes ----
  const NOTES = `(() => [...document.querySelectorAll("main a[data-note]")].map(a => ({
    href: a.getAttribute("href"), status: a.dataset.note, tilt: a.style.getPropertyValue("--tilt"),
    stamp: !!a.querySelector("[data-note-stamp]"), own: [...a.querySelectorAll("[data-note-badge]")].some(b => b.textContent === ${JSON.stringify(BOARD_COPY.yourPost)}),
    sr: a.querySelector(".sr-only:last-child")?.textContent,
  })))()`
  const B = tabs.donor1
  await B.goto("/board", 1200)
  const notes = await B.evaluate(NOTES)
  const expected = await sql`select id, status from food_requests fr
    where (status = 'open' and exists (select 1 from users p where p.id = fr.created_by and (p.role = 'outreach' or p.verification_status = 'approved'))) or status = 'claimed'
    order by case when status = 'open' then 0 else 1 end, window_start`
  check(`Board shows Open then In Progress, soonest first (${notes.length} notes)`, JSON.stringify(notes.map((n) => n.href)) === JSON.stringify(expected.map((r) => `/requests/${r.id}?from=board`)), notes.map((n) => n.status).join(","))
  check("No Fulfilled or Cancelled needs on the board", !notes.some((n) => n.href.includes(R.R5) || n.href.includes(R.R6)) && notes.every((n) => n.status === "open" || n.status === "claimed"))
  check("The \"Claimed\" stamp only on In Progress notes", notes.every((n) => n.stamp === (n.status === "claimed")) && notes.some((n) => n.stamp), notes.filter((n) => n.stamp).length + " stamped")
  check("Each note tells screen readers its status", notes.every((n) => n.sr === `${BOARD_COPY.status} ${n.status === "open" ? "Open" : "In Progress"}`))
  check("\"Your post\" only on the organization's own post", notes.every((n) => n.own === n.href.includes(ownId)))
  const otherOrg = tabs.donor2; await otherOrg.goto("/board", 1000)
  check("…and not for another organization", !(await otherOrg.evaluate(NOTES)).some((n) => n.own))
  const tilts = notes.map((n) => parseFloat(n.tilt))
  check("Every note tilts between -1.5° and 1.5°", tilts.every((d) => d >= -1.5 && d <= 1.5) && new Set(tilts).size > 1, tilts.join(", "))
  await B.reload(1200)
  const again = await B.evaluate(NOTES)
  check("Each note's tilt is the same after reloading", JSON.stringify(again.map((n) => [n.href, n.tilt])) === JSON.stringify(notes.map((n) => [n.href, n.tilt])))

  // Text stays on the paper, below the strip and clear of the curl. Measured with the tilt
  // off, in the note's own coordinates.
  const GEOMETRY = `(() => {
    for (const a of document.querySelectorAll("main a[data-note]")) a.style.setProperty("--tilt", "0deg")
    return [...document.querySelectorAll("main a[data-note]")].map(a => {
      const n = a.getBoundingClientRect(), z = ${JSON.stringify(ZONES)}, bad = []
      const boxes = []
      for (const el of a.querySelectorAll("[data-note-body] *, [data-note-stamp]")) {
        if (el.closest(".sr-only")) continue
        if (el.matches("[data-note-badge], [data-note-stamp], svg")) { boxes.push([el.matches("svg") ? "icon" : el.textContent, el.getBoundingClientRect()]); continue }
        // Lines hidden by the 3-line clamp still report boxes; only the lines that show count.
        const clampBottom = el.closest("[data-note-title]")?.getBoundingClientRect().bottom ?? Infinity
        for (const t of el.childNodes) if (t.nodeType === 3 && t.textContent.trim()) { const r = document.createRange(); r.selectNodeContents(t); for (const b of r.getClientRects()) if (b.top < clampBottom - 1) boxes.push([t.textContent.slice(0, 20), b]) }
      }
      for (const [label, b] of boxes) {
        const x0 = (b.left - n.left) / n.width, x1 = (b.right - n.left) / n.width, y0 = (b.top - n.top) / n.width, y1 = (b.bottom - n.top) / n.width
        if (x0 < z.paper.left || x1 > z.paper.right || y1 > z.paper.bottom) bad.push(label + " off the paper")
        if (y0 < z.stripBottom) bad.push(label + " on the strip")
        if (x1 > z.curl.left && y1 > z.curl.top) bad.push(label + " on the curl")
      }
      // The stamp never covers other text or a badge.
      const stamp = a.querySelector("[data-note-stamp]")?.getBoundingClientRect()
      if (stamp) for (const [label, b] of boxes) if (label !== ${JSON.stringify(BOARD_COPY.stamp)} && b.left < stamp.right && b.right > stamp.left && b.top < stamp.bottom && b.bottom > stamp.top) bad.push(label + " under the stamp")
      const title = a.querySelector("[data-note-title]"), lh = parseFloat(getComputedStyle(title).lineHeight)
      return { href: a.getAttribute("href"), bad, lines: Math.round(title.getBoundingClientRect().height / lh), cut: title.scrollHeight > title.clientHeight + 1, size: Math.round(n.width) }
    })
  })()`

  // ---- 4. Both themes, four widths: layout, targets, contrast, notes ----
  const D = tabs.donor1
  for (const theme of ["light", "dark"]) {
    await D.goto("/"); await D.theme(theme)
    for (const w of [320, 390, 1024, 1280]) {
      const tag = `${theme} ${w}px`
      await D.size(w, w < 640 ? 844 : 900)
      await D.goto("/board", 1400)
      // The audit compares upright boxes; on a tilted note, neighboring lines' boxes overlap
      // by a few pixels even though the text doesn't. So it runs with the tilt off.
      await D.evaluate(`document.querySelectorAll("main a[data-note]").forEach((a) => a.style.setProperty("--tilt", "0deg")), true`); await sleep(300)
      await audit(D, "Needs Board", w, theme)
      const g = await D.evaluate(GEOMETRY)
      const bad = g.filter((n) => n.bad.length)
      check(`${tag}: every note's text is on the paper, below the strip, clear of the curl (notes ${g[0]?.size}px)`, bad.length === 0, bad.slice(0, 2))
      const long = g.find((n) => n.href.includes(longId))
      check(`${tag}: long items text stops at 3 lines`, long && long.lines <= 3 && long.cut && g.every((n) => n.lines <= 3), long)
      const targets = await D.evaluate(`[...document.querySelectorAll("main a[data-note]")].every(a => { const r = a.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 })`)
      check(`${tag}: every note is a link at least 44px`, targets)
      const c = await D.evaluate(TEXT_CONTRAST)
      check(`${tag}: page text readable (${c.checked} elements; notes measured below)`, c.failures.length === 0, c.failures.slice(0, 3).join(" | "))
      if (w === 390 || w === 1280) {
        for (const [i, label] of [[1, "an Open note"], [notes.findIndex((n) => n.status === "claimed") + 1, "an In Progress note"]]) {
          const px = await lowestPixelContrast(D, `main li:nth-child(${i}) [data-note-body]`)
          check(`${tag}: ${label}: text and badges at least 7:1 on the yellow (lowest ${px.worst}:1, ${px.name})`, px.worst >= 7, px)
        }
        const st = await stampContrast(D, `main li:nth-child(${notes.findIndex((n) => n.status === "claimed") + 1}) [data-note-stamp]`)
        check(`${tag}: the "Claimed" stamp's ink on the yellow at least 7:1 (lowest ${st}:1)`, st >= 7, st)
        await D.evaluate("scrollTo(0, 0), true"); await sleep(200)
        await D.shot(`board-${theme}-${w}.png`, { full: true })
      }
      await D.goto(`/requests/${R.R1}?from=board`, 1200)
      await audit(D, "need page (open)", w, theme)
      const cd = await D.evaluate(TEXT_CONTRAST)
      check(`${tag}: need page text readable (${cd.checked} elements)`, cd.failures.length === 0, cd.failures.slice(0, 3).join(" | "))
      if (w === 390 || w === 1280) await D.shot(`need-${theme}-${w}.png`, { full: true })
      await D.goto(`/requests/${R.R4}`, 1200)
      await audit(D, "need page (claimed, with contact)", w, theme)
      if (w === 390 || w === 1280) await D.shot(`need-claimed-${theme}-${w}.png`, { full: true })
    }
  }

  // ---- 5. Keyboard: Tab through the notes, Enter opens one, then the back link ----
  await D.size(1280, 900)
  await D.goto("/board", 1400)
  await D.evaluate("document.activeElement?.blur(), scrollTo(0, 0), true")
  const FOCUS = `(() => { const a = document.activeElement, ring = a?.querySelector?.("[data-note-ring]"); return { note: !!a?.matches?.("a[data-note]"), href: a?.getAttribute?.("href"), ring: ring ? getComputedStyle(ring).opacity : null, outline: ring ? getComputedStyle(ring).outlineStyle : null } })()`
  const seen = []
  for (let i = 0; i < 40 && seen.length < notes.length; i++) {
    await D.key("Tab", "Tab", 9); await sleep(60)
    const f = await D.evaluate(FOCUS)
    if (f.note) seen.push(f)
  }
  check(`Tab reaches every note in order (${seen.length}/${notes.length})`, JSON.stringify(seen.map((f) => f.href)) === JSON.stringify(notes.map((n) => n.href)))
  check("Every focused note shows its focus ring", seen.length > 0 && seen.every((f) => f.ring === "1" && f.outline === "solid"))
  await D.shot("board-focus-1280.png")
  // Back to the first note, then Enter.
  await D.evaluate(`document.querySelector("main a[data-note]").focus(), true`)
  await D.key("Enter", "Enter", 13)
  await D.waitFor(`location.pathname === "/requests/${notes[0].href.split("/")[2].split("?")[0]}"`, "need page after Enter")
  await sleep(800)
  check("Enter on a note opens its page", true)
  await D.evaluate("document.activeElement?.blur(), true")
  let onBack = false
  for (let i = 0; i < 20 && !onBack; i++) {
    await D.key("Tab", "Tab", 9); await sleep(60)
    onBack = await D.evaluate(`document.activeElement?.textContent.trim() === ${JSON.stringify(DETAIL_COPY.backToBoard)}`)
  }
  const backRing = await D.evaluate(`getComputedStyle(document.activeElement).boxShadow`)
  check("Tab reaches the back link, with a visible focus ring", onBack && backRing !== "none", backRing)
  await D.key("Enter", "Enter", 13)
  await D.waitFor(`location.pathname === "/board"`, "board after the back link")
  check("Enter on the back link returns to the Needs Board", true)

  // ---- 6. Motion: notes straighten and lift on hover, but not with reduced motion ----
  const HOVER = `(async () => {
    const a = document.querySelector("main a[data-note]"), r = a.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, before: { rotate: getComputedStyle(a).rotate, translate: getComputedStyle(a).translate } }
  })()`
  const AFTER = `(() => { const a = document.querySelector("main a[data-note]"), cs = getComputedStyle(a); return { rotate: cs.rotate, translate: cs.translate, transition: cs.transitionDuration } })()`
  for (const motion of ["no-preference", "reduce"]) {
    await D.media("dark", motion)
    await D.goto("/board", 1200)
    const h = await D.evaluate(HOVER)
    await D.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: h.x, y: h.y }); await sleep(400)
    const a = await D.evaluate(AFTER)
    if (motion === "reduce") check("Reduced motion: hovering a note changes nothing (tilt stays, no lift, no transition)", a.rotate === h.before.rotate && a.translate === h.before.translate && a.transition.split(",").every((d) => parseFloat(d) <= 0.001), { before: h.before, after: a })
    else check("Hovering a note straightens and lifts it", (a.rotate === "0deg" || a.rotate === "none") && a.translate !== h.before.translate, { before: h.before, after: a })
    await D.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 })
  }
  await D.media("dark")

  // ---- 7. Inbox and bell ----
  const INBOX = `(() => {
    const items = [...document.querySelectorAll("[data-inbox-item]")].map(li => ({ state: li.dataset.inboxItem, text: li.querySelector("button span.flex-col > span:not(.sr-only)")?.textContent, bold: parseInt(getComputedStyle(li.querySelector("button span.flex-col > span:not(.sr-only)")).fontWeight) >= 600, dot: getComputedStyle(li.querySelector("button > span[aria-hidden]")).backgroundColor, h: Math.round(li.querySelector("button").getBoundingClientRect().height) }))
    const bell = document.querySelector("[data-inbox-bell]")
    return {
      first: document.querySelector("main section")?.id, items, markAll: [...document.querySelectorAll("#inbox button")].some(b => b.textContent.trim() === ${JSON.stringify(INBOX_COPY.markAllRead)}),
      empty: document.querySelector("#inbox")?.innerText.includes(${JSON.stringify(INBOX_COPY.empty)}),
      bell: bell && { label: bell.getAttribute("aria-label"), count: bell.querySelector("[data-inbox-count]")?.textContent ?? null, shown: !!bell.getClientRects().length, href: bell.getAttribute("href"), w: Math.round(bell.getBoundingClientRect().width), h: Math.round(bell.getBoundingClientRect().height) },
    }
  })()`
  const O1 = tabs.outreach1, O2 = tabs.outreach2, D2 = tabs.donor2, AD = tabs.admin
  for (const t of [O1, O2, D2, AD, tabs.anon]) { await t.size(1280, 900); await t.media("light"); await t.goto("/"); await t.theme("light") }

  await D2.goto("/dashboard", 1200)
  let inbox = await D2.evaluate(INBOX)
  check("Inbox is the first section on the dashboard", inbox.first === "inbox", inbox.first)
  check("Unread notifications have a dot and bold text; newest first", inbox.items.length === 2 && inbox.items.every((i) => i.state === "unread" && i.bold && i.dot !== "rgba(0, 0, 0, 0)") && inbox.items[0].text.includes("marked a need you supported as fulfilled"), inbox.items)
  check("Each notification is a 44px target", inbox.items.every((i) => i.h >= 44))
  check(`Bell: "${INBOX_COPY.bellLabel.replace("{n}", "2")}", count 2, links to the inbox, 44px`, inbox.bell?.label === "Inbox, 2 unread" && inbox.bell.count === "2" && inbox.bell.href === "/dashboard#inbox" && inbox.bell.w >= 44 && inbox.bell.h >= 44, inbox.bell)
  check("Notification text carries no review note and no email", !inbox.items.some((i) => /@|didn't match/.test(i.text)))

  // Opening an approval notification goes to the dashboard and marks it read.
  const clickItem = (t, text) => t.evaluate(`[...document.querySelectorAll("[data-inbox-item] button")].find(b => b.innerText.includes(${JSON.stringify(text)})).click(), true`)
  await clickItem(D2, "Your organization was approved"); await sleep(300)
  await D2.waitFor(`location.pathname === "/dashboard" && [...document.querySelectorAll("[data-inbox-item]")].some(li => li.dataset.inboxItem === "read" && li.innerText.includes("approved"))`, "approval notification read")
  inbox = await D2.evaluate(INBOX)
  check("Opening an approval notification stays on the dashboard and marks it read; the bell counts 1", inbox.items.find((i) => i.text.includes("approved"))?.state === "read" && inbox.bell.label === "Inbox, 1 unread", inbox.bell)

  // Opening a need notification goes to the need's page and marks it read.
  await clickItem(D2, "marked a need you supported as fulfilled")
  await D2.waitFor(`location.pathname === "/requests/${R.R5}"`, "need page from the inbox"); await sleep(600)
  const bellAfter = await D2.evaluate(`document.querySelector("[data-inbox-bell]").getAttribute("aria-label")`)
  const [readRow] = await sql`select read_at from notifications where id = '5eed0000-0000-4000-8000-000000000103'`
  check("Opening a need notification opens the need's page and marks it read", !!readRow.read_at && bellAfter === INBOX_COPY.bellLabelNone, bellAfter)
  await D2.goto("/dashboard", 1000)
  inbox = await D2.evaluate(INBOX)
  check("With nothing unread: no Mark all as read, the bell shows no count", !inbox.markAll && inbox.bell.count === null && inbox.bell.label === INBOX_COPY.bellLabelNone, inbox.bell)

  // A claim shows up in the poster's inbox on their next page load.
  await O1.goto("/dashboard", 1000)
  const before = await O1.evaluate(INBOX)
  await tabs.donor1.goto(`/requests/${R.R1}?from=board`, 1000)
  await clickButtonByText(tabs.donor1, "Claim this need"); await sleep(200); await clickButtonByText(tabs.donor1, "Yes, claim it")
  await tabs.donor1.waitFor(`!!document.querySelector('main a[href^="mailto:"]')`, "claimed")
  await O1.goto("/dashboard", 1000)
  inbox = await O1.evaluate(INBOX)
  check("After an organization claims a need, the poster sees it in the inbox on the next page load (unread, first)", inbox.items[0]?.state === "unread" && inbox.items[0].text === "Test — Corner Bakery Co-op claimed your need: Hot meals" && inbox.items.length === before.items.length + 1, inbox.items[0])
  check("…and the bell counts it", inbox.bell.label === `Inbox, ${inbox.items.filter((i) => i.state === "unread").length} unread`, inbox.bell.label)

  // Mark all as read.
  await O1.evaluate(`[...document.querySelectorAll("#inbox button")].find(b => b.textContent.trim() === ${JSON.stringify(INBOX_COPY.markAllRead)}).click(), true`)
  await O1.waitFor(`![...document.querySelectorAll("[data-inbox-item]")].some(li => li.dataset.inboxItem === "unread")`, "all read")
  inbox = await O1.evaluate(INBOX)
  check("Mark all as read: every item read (no dot, regular weight), the button goes, the bell clears", inbox.items.every((i) => i.state === "read" && !i.bold && i.dot === "rgba(0, 0, 0, 0)") && !inbox.markAll && inbox.bell.count === null, inbox.bell)

  // More than 9 unread shows "9+".
  const [d1] = await sql`select id from users where email = ${EMAIL.donor1}`
  for (let i = 0; i < 11; i++) await sql`insert into notifications (user_id, type) values (${d1.id}, 'org_approved')`
  await tabs.donor1.goto("/dashboard", 1000)
  inbox = await tabs.donor1.evaluate(INBOX)
  check("More than 9 unread: the bell shows 9+ and says the real number", inbox.bell.count === "9+" && /^Inbox, 1[1-9] unread$/.test(inbox.bell.label), inbox.bell)
  check("The inbox lists the 10 newest", inbox.items.length === 10)

  // Empty state, and no bell when signed out.
  await AD.goto("/dashboard", 1000)
  inbox = await AD.evaluate(INBOX)
  check("Empty inbox: the EmptyState message", inbox.empty && inbox.items.length === 0 && inbox.bell.label === INBOX_COPY.bellLabelNone)
  await tabs.anon.goto("/", 800)
  check("Signed out: no bell", !(await tabs.anon.evaluate(`!!document.querySelector("[data-inbox-bell]")`)))

  // Below 360px the bell is in the phone menu.
  await D2.size(320, 700); await D2.goto("/dashboard", 1000)
  const small = await D2.evaluate(`(() => { const b = document.querySelector("[data-inbox-bell]"); const i = [...document.querySelectorAll("header nav ul[id] a")].find(a => a.getAttribute("href") === "/dashboard#inbox"); return { bell: !!b.getClientRects().length, item: i && { label: i.getAttribute("aria-label"), text: i.textContent.trim() } } })()`)
  check("At 320px the bell moves into the phone menu as Inbox", !small.bell && small.item?.text === INBOX_COPY.menuItem && small.item.label === INBOX_COPY.bellLabelNone, small)
  await D2.size(360, 700); await D2.goto("/dashboard", 1000)
  check("From 360px the bell is in the header", await D2.evaluate(`!!document.querySelector("[data-inbox-bell]").getClientRects().length`))

  // The inbox in both themes at each width (outreach2 has an unread claim).
  for (const theme of ["light", "dark"]) {
    await O2.goto("/"); await O2.theme(theme)
    for (const w of [320, 390, 1024, 1280]) {
      await O2.size(w, w < 640 ? 844 : 900)
      await O2.goto("/dashboard", 1200)
      await audit(O2, "dashboard with inbox", w, theme)
      const c = await O2.evaluate(TEXT_CONTRAST)
      check(`${theme} ${w}px: inbox page text readable (${c.checked} elements)`, c.failures.length === 0, c.failures.slice(0, 3).join(" | "))
      if (w === 390 || w === 1280) await O2.shot(`inbox-${theme}-${w}.png`)
    }
  }

  // Reduced motion: nothing on the board, a need's page, or the dashboard animates.
  const MOVING = `[...document.querySelectorAll("body *")].filter(e => { const cs = getComputedStyle(e); return cs.animationName !== "none" && parseFloat(cs.animationDuration) > 0.001 || cs.transitionProperty !== "none" && cs.transitionDuration.split(",").some(d => parseFloat(d) > 0.001) }).map(e => e.tagName.toLowerCase() + "." + [...e.classList].slice(0, 2).join(".")).slice(0, 5)`
  await O2.media("dark", "reduce"); await O2.size(1280, 900)
  for (const path of ["/dashboard", `/requests/${R.R4}`]) {
    await O2.goto(path, 1000)
    const moving = await O2.evaluate(MOVING)
    check(`Reduced motion: nothing animates on ${path === "/dashboard" ? "the dashboard (inbox)" : "a need's page"}`, moving.length === 0, moving)
  }
  await D.media("dark", "reduce"); await D.size(1280, 900); await D.goto("/board", 1000)
  const movingBoard = await D.evaluate(MOVING)
  check("Reduced motion: nothing animates on the Needs Board", movingBoard.length === 0, movingBoard)
} catch (e) {
  await cleanUp()
  await finish(suite, browser, e)
}
await cleanUp()
await finish(suite, browser)

/**
 * The stamp's ink color against the paper behind it, from real pixels: hide the stamp,
 * screenshot, and compare its color with every pixel in its box. The lowest ratio.
 */
async function stampContrast(t, selector) {
  await t.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" }), true`); await sleep(200)
  const box = await t.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(selector)}), r = e.getBoundingClientRect(); const out = { x: r.x * devicePixelRatio, y: r.y * devicePixelRatio, w: r.width * devicePixelRatio, h: r.height * devicePixelRatio, color: getComputedStyle(e).color }; e.style.visibility = "hidden"; return out })()`)
  await sleep(80)
  const { data } = await t.send("Page.captureScreenshot", { format: "png" })
  await t.evaluate(`document.querySelector(${JSON.stringify(selector)}).style.visibility = "", true`)
  return t.evaluate(`(async () => {
    const img = new Image(); img.src = "data:image/png;base64,${data}"; await img.decode()
    const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height
    const ctx = cv.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0)
    const p = document.createElement("canvas").getContext("2d"); p.fillStyle = ${JSON.stringify(box.color)}; p.fillRect(0, 0, 1, 1); const fg = p.getImageData(0, 0, 1, 1).data
    const lum = (r, g, b) => [r, g, b].map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
    const lf = lum(fg[0], fg[1], fg[2]); let worst = Infinity
    const d = ctx.getImageData(Math.round(${box.x}), Math.round(${box.y}), Math.max(1, Math.round(${box.w})), Math.max(1, Math.round(${box.h}))).data
    for (let i = 0; i < d.length; i += 4) { const lb = lum(d[i], d[i + 1], d[i + 2]); const [a, b] = [lf, lb].sort((m, n) => n - m); worst = Math.min(worst, (a + 0.05) / (b + 0.05)) }
    return +worst.toFixed(2)
  })()`)
}

/** Clicks the button in main with this text. */
function clickButtonByText(t, label) {
  return t.evaluate(`(() => { const b = [...document.querySelectorAll("main button")].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!b) throw new Error("no button ${label}"); b.click(); return true })()`)
}

/** Deletes exactly the needs this run added (the harness then reseeds the rest). */
async function cleanUp() {
  if (!added.length) return
  const gone = await sql`delete from food_requests where id = any(${added}) and items like ${`${TAG}%`} returning id`
  check(`Cleanup: removed the ${added.length} needs this run added`, gone.length === added.length, `${gone.length}/${added.length}`)
  added.length = 0
}
