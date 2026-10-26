// Organization verification: /admin is a real 404 for everyone but admins (with no admin
// data in the HTML), the illustrated 404 page (identical for a missing page and a forbidden
// one, its layout in both themes), the review page's details and links, approve / revoke and
// their effect on claiming and contact emails.
//   npm run e2e:verification
//   npm run e2e:verification -- --signups   also signs up a new poster and organization
//     through the forms and rejects the organization with a note. This creates two accounts
//     on the-bridge-dev (signup.c-poster@example.com, signup.c-org@example.com) that reseeding
//     doesn't remove, so it only works once until they're deleted.

import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"
import { NOT_FOUND_COPY } from "../../src/lib/copy.ts"

const suite = await setup("verification")
const browser = await launchBrowser(suite)
const { check, sql, password: PASSWORD } = suite

// Things only an admin should ever see.
const ADMIN_MARKERS = ["Organization review", "IRS Tax Exempt", "00-1234567", "example.org/organization-c", "Test — Contact C", "test.donor3@example.com", "Revoke approval"]
const markersIn = (html, except = []) => ADMIN_MARKERS.filter((m) => !except.includes(m) && html.includes(m))
const NOT_FOUND = `document.querySelector("main h1")?.textContent === ${JSON.stringify(NOT_FOUND_COPY.title)}`
// The 404 page's main content, to compare a missing page with a forbidden one.
const MAIN = `document.querySelector("main").outerHTML`
const adminStatus = (t) => t.evaluate(`fetch("/admin", { cache: "no-store" }).then(async r => ({ status: r.status, html: await r.text() }))`)
const card = (name) => `[...document.querySelectorAll("main [data-slot=card]")].find(c => c.querySelector("[data-slot=card-title]")?.textContent.trim() === ${JSON.stringify(name)})`
const tabCounts = `Object.fromEntries([...document.querySelectorAll('nav[aria-label="Review status"] a')].map(a => [a.childNodes[0].textContent.trim(), +a.querySelector("span").textContent]))`
const clickButton = (t, scope, label) => t.evaluate(`(() => { const b = [...(${scope}).querySelectorAll("button")].find(b => b.textContent.trim() === ${JSON.stringify(label)}); if (!b) throw new Error("no button ${label}"); b.click(); return true })()`)
const ORG_C = "Test — Organization C (pending)"

try {
  // ---- 1. Access control ----
  const anon = await browser.newTab()
  await anon.goto("/admin")
  const a1 = await adminStatus(anon)
  check("Signed-out visitor: /admin is the standard not-found page, HTTP 404", a1.status === 404 && await anon.evaluate(NOT_FOUND), `HTTP ${a1.status}`)
  check("Signed-out visitor: no admin data in the page HTML", markersIn(a1.html).length === 0 && markersIn(await anon.evaluate("document.documentElement.outerHTML")).length === 0)

  const who = {}
  for (const [key, email, label] of [["donor1", "test.donor1@example.com", "approved organization"], ["outreach1", "test.outreach1@example.com", "outreach account"], ["donor3", "test.donor3@example.com", "pending organization"]]) {
    const t = await browser.newTab(); await t.signIn(email); who[key] = t
    await t.goto("/admin")
    const r = await adminStatus(t)
    const html = await t.evaluate("document.documentElement.outerHTML")
    const except = key === "donor3" ? ["test.donor3@example.com"] : []
    check(`Non-admin (${label}): /admin is not-found, HTTP 404, no admin data in the HTML`, r.status === 404 && await t.evaluate(NOT_FOUND) && markersIn(r.html, except).length === 0 && markersIn(html, except).length === 0, `HTTP ${r.status}; markers ${markersIn(r.html, except).join(",") || "none"}`)
    await t.goto("/dashboard")
    check(`Non-admin (${label}): no Admin link in the header`, !(await t.evaluate(`!!document.querySelector('header a[href="/admin"]')`)))
  }
  // The branded 404 page looks exactly the same for a page that doesn't exist and for
  // /admin seen by someone who isn't an admin.
  const missing = await anon.evaluate(`fetch("/no-such-page", { cache: "no-store" }).then((r) => r.status)`)
  await anon.goto("/no-such-page")
  const missingMain = await anon.evaluate(MAIN)
  await who.donor1.goto("/admin")
  const forbiddenMain = await who.donor1.evaluate(MAIN)
  await anon.goto("/admin")
  const anonAdminMain = await anon.evaluate(MAIN)
  await who.outreach1.goto("/admin")
  const outreachMain = await who.outreach1.evaluate(MAIN)
  check("Branded 404: a missing page and a forbidden /admin (signed in as an organization or outreach, or signed out) look identical, HTTP 404", missing === 404 && missingMain === forbiddenMain && missingMain === anonAdminMain && missingMain === outreachMain && (await anon.evaluate(NOT_FOUND)), `missing page HTTP ${missing}; identical: ${missingMain === forbiddenMain && missingMain === anonAdminMain && missingMain === outreachMain}`)

  // The 404 page's layout: the illustration, the h1 and the button, nothing else; both themes.
  const LAYOUT = `(() => {
    const main = document.querySelector("main"), img = main.querySelector("img"), h1 = main.querySelector("h1"), link = main.querySelector("a")
    const glow = main.querySelector(".hero-glow"), gcs = glow && getComputedStyle(glow), ir = img.getBoundingClientRect(), mcs = getComputedStyle(main)
    const inner = main.getBoundingClientRect().width - parseFloat(mcs.paddingLeft) - parseFloat(mcs.paddingRight)
    const order = ir.bottom <= h1.getBoundingClientRect().top + 0.5 && h1.getBoundingClientRect().bottom <= link.getBoundingClientRect().top + 0.5
    const centered = [img, h1, link].every((e) => { const r = e.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - document.documentElement.clientWidth / 2) <= 2 })
    return {
      overflow: document.documentElement.scrollWidth > innerWidth, h1s: document.querySelectorAll("h1").length,
      text: main.innerText.trim().split(/\\n+/).map((l) => l.trim()).filter(Boolean),
      alt: img.alt, reserved: img.hasAttribute("width") && img.hasAttribute("height"), src: img.currentSrc, loading: img.loading,
      width: Math.round(ir.width), height: Math.round(ir.height), ratio: ir.width / ir.height, inner: Math.round(inner),
      h1Font: getComputedStyle(h1).fontFamily, href: link.getAttribute("href"), linkHeight: link.getBoundingClientRect().height, linkBg: getComputedStyle(link).backgroundColor,
      glow: glow && { hidden: glow.getAttribute("aria-hidden"), anim: gcs.animationName, filter: gcs.filter, events: gcs.pointerEvents },
      glowToken: getComputedStyle(document.documentElement).getPropertyValue("--hero-glow"), order, centered,
    }
  })()`
  for (const theme of ["light", "dark"]) {
    await anon.goto("/no-such-page"); await anon.theme(theme)
    for (const w of [320, 390, 1024, 1280, 1440]) {
      const tag = `404 ${theme} ${w}px`
      await anon.size(w); await anon.goto("/no-such-page", 300)
      const L = await anon.evaluate(LAYOUT)
      check(`${tag}: no overflow; only the illustration, the h1 "${NOT_FOUND_COPY.title}" and the button, stacked and centered`, !L.overflow && L.h1s === 1 && L.text.join("|") === `${NOT_FOUND_COPY.title}|${NOT_FOUND_COPY.home}` && L.order && L.centered, L)
      check(`${tag}: illustration (not-found.png) with its alt text, space reserved, at its own shape`, L.src.includes("not-found") && L.alt === NOT_FOUND_COPY.imageAlt && L.reserved && Math.abs(L.ratio - 1447 / 1087) < 0.02, `${L.width}x${L.height}`)
      if (w < 1024) check(`${tag}: illustration full container width`, Math.abs(L.width - L.inner) <= 1, `${L.width} / ${L.inner}`)
      else check(`${tag}: illustration about 720px wide at most`, L.width <= 720.5 && L.width >= 600, `${L.width}px`)
      check(`${tag}: h1 in Raleway; button to / at least 44px (${Math.round(L.linkHeight)}px), primary fill`, /Raleway/.test(L.h1Font) && L.href === "/" && L.linkHeight >= 44 && Math.abs(L.linkHeight - 48) < 1 && L.linkBg !== "rgba(0, 0, 0, 0)", { font: L.h1Font, bg: L.linkBg })
      check(`${tag}: faint glow behind the illustration: decorative, static, ${theme === "light" ? "half" : "full"} strength`, !!L.glow && L.glow.hidden === "true" && L.glow.anim === "none" && L.glow.events === "none" && L.glow.filter.startsWith("blur") && L.glowToken.includes(theme === "light" ? "7.5%" : "15%"), { glow: L.glow, token: L.glowToken })
      if (w === 390 || w === 1280) await anon.shot(`404-${theme}-${w}.png`)
    }
  }
  const ring = await anon.evaluate(`(() => { const a = document.querySelector("main a"); a.focus(); return { focused: document.activeElement === a && a.matches(":focus-visible"), ring: getComputedStyle(a).boxShadow } })()`)
  check("404: the button shows a visible focus ring", ring.focused && ring.ring !== "none", ring)
  // The heading and the button stay above the fold on laptop screens.
  for (const [w, h] of [[1280, 800], [1440, 900]]) {
    await anon.send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false })
    await anon.goto("/no-such-page", 300)
    const f = await anon.evaluate(`(() => { const q = (s) => document.querySelector(s).getBoundingClientRect(); return { imgWidth: Math.round(q("main img").width), imgBottom: Math.round(q("main img").bottom), h1Bottom: Math.round(q("main h1").bottom), linkBottom: Math.round(q("main a").bottom), fold: innerHeight } })()`)
    check(`404 ${w}x${h}: illustration (${f.imgWidth}px wide), heading and button all above the fold (button ends at ${f.linkBottom}px)`, f.linkBottom <= f.fold && f.h1Bottom <= f.fold, f)
    await anon.shot(`404-fold-${w}x${h}.png`)
  }
  await anon.size(390)

  // A pending organization's dashboard never contains anyone's email but its own.
  const pendingHtml = await who.donor3.evaluate("document.documentElement.outerHTML")
  // The banner's "Questions? Contact …" address (ADMIN_CONTACT_EMAIL) is the only other
  // email allowed, and the only mailto link.
  const adminContact = process.env.ADMIN_CONTACT_EMAIL?.trim().toLowerCase()
  const otherEmails = (pendingHtml.match(/[a-z0-9.+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).filter((e) => !["test.donor3@example.com", adminContact].includes(e.toLowerCase()))
  // (In the server payload the link is inside an escaped string, so it ends with a backslash.)
  const mailtos = (pendingHtml.match(/mailto:[^"]+/g) || []).filter((m) => m.replace(/\\+$/, "").toLowerCase() !== `mailto:${adminContact}`)
  check("Pending organization's dashboard HTML has no poster's email (or anyone else's but the admin contact)", otherEmails.length === 0 && mailtos.length === 0, `${otherEmails.length} other emails, ${mailtos.length} other mailto links`)

  // ---- 2. Admin page ----
  const admin = await browser.newTab(); await admin.signIn("test.admin@example.com")
  check("Admin sees the Admin link in the header", await admin.evaluate(`!!document.querySelector('header a[href="/admin"]')`))
  await admin.goto("/admin")
  const ra = await adminStatus(admin)
  check("Admin: /admin loads (HTTP 200) with the Pending tab selected", ra.status === 200 && await admin.evaluate(`document.querySelector('nav[aria-label="Review status"] a[aria-current=page]')?.childNodes[0].textContent.trim() === "Pending"`), `HTTP ${ra.status}`)
  check("Tabs show counts: Pending 1, Approved 2, Rejected 0", JSON.stringify(await admin.evaluate(tabCounts)) === JSON.stringify({ Pending: 1, Approved: 2, Rejected: 0 }), JSON.stringify(await admin.evaluate(tabCounts)))
  const pc = await admin.evaluate(`(() => {
    const c = ${card(ORG_C)}; if (!c) return null
    const field = (label) => [...c.querySelectorAll("dt")].find(d => d.textContent === label)?.nextElementSibling
    const site = field("Website")?.querySelector("a"), irs = [...c.querySelectorAll("a")].find(a => a.textContent.includes("IRS"))
    return {
      website: site?.getAttribute("href"), siteTarget: site?.target, siteRel: site?.rel,
      ein: field("EIN")?.textContent, contact: field("Contact")?.textContent, email: field("Email")?.textContent, applied: field("Applied")?.textContent,
      irs: irs?.getAttribute("href"), irsTarget: irs?.target, irsRel: irs?.rel,
      checklist: [...c.querySelectorAll('section[aria-label=Verification] li')].map(li => li.textContent),
      buttons: [...c.querySelectorAll("button")].map(b => b.textContent.trim()),
    }
  })()`)
  check("Pending card: name, website, EIN, contact, email, applied date", pc && pc.website === "https://example.org/organization-c" && pc.ein === "00-1234567" && pc.contact === "Test — Contact C" && pc.email === "test.donor3@example.com" && /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(pc.applied ?? ""), JSON.stringify({ ...pc, checklist: undefined, buttons: undefined }))
  check("Website opens in a new tab with rel=\"noopener noreferrer\"", pc?.siteTarget === "_blank" && pc.siteRel === "noopener noreferrer")
  check("IRS Tax Exempt Organization Search link, new tab, noopener noreferrer", pc?.irs === "https://apps.irs.gov/app/eos/" && pc.irsTarget === "_blank" && pc.irsRel === "noopener noreferrer")
  check("Verification checklist has the three reminders", JSON.stringify(pc?.checklist) === JSON.stringify(["Website matches the organization name", "EIN found in IRS search (if provided)", "Contact email domain matches the website (if possible)"]))
  check("Pending card has Approve and Reject", JSON.stringify(pc?.buttons) === JSON.stringify(["Approve", "Reject"]))

  // ---- 3. Approve test.donor3, then it can claim ----
  await clickButton(admin, card(ORG_C), "Approve"); await sleep(300)
  const confirmText = await admin.evaluate(`(${card(ORG_C)}).querySelector('[role=group] p').textContent`)
  check("Approve asks for confirmation first", confirmText === `Approve ${ORG_C}? They'll be able to claim needs and see contact information.`, confirmText)
  await clickButton(admin, card(ORG_C), "Not now"); await sleep(200)
  check("\"Not now\" backs out without approving", (await sql`select verification_status v from users where email = 'test.donor3@example.com'`)[0].v === "pending")
  await clickButton(admin, card(ORG_C), "Approve"); await sleep(200); await clickButton(admin, card(ORG_C), "Yes, approve")
  await admin.waitFor(`!${card(ORG_C)}`, "card leaves Pending"); await sleep(800)
  await admin.goto("/admin?tab=approved")
  const ap = await admin.evaluate(`(() => { const c = ${card(ORG_C)}; const f = (l) => [...c.querySelectorAll("dt")].find(d => d.textContent === l)?.nextElementSibling?.textContent; return c && { by: f("Reviewed by"), on: f("Reviewed"), buttons: [...c.querySelectorAll("button")].map(b => b.textContent.trim()) } })()`)
  check("Approved tab shows who reviewed it and when, with Revoke approval", ap?.by === "Test — Admin" && /\d{4}$/.test(ap.on ?? "") && JSON.stringify(ap.buttons) === '["Revoke approval"]', JSON.stringify(ap))
  check("Tab counts after approval: Pending 0, Approved 3", JSON.stringify(await admin.evaluate(tabCounts)) === JSON.stringify({ Pending: 0, Approved: 3, Rejected: 0 }))

  const D3 = who.donor3
  await D3.goto("/board")
  const needHref = await D3.evaluate(`document.querySelector('main a[data-note="open"]')?.getAttribute("href")`)
  await D3.goto(needHref)
  const target = await D3.evaluate(`document.querySelector("main h1").textContent`)
  check("Approved test.donor3 now sees Claim this need on an open need", !!target && await D3.evaluate(`[...document.querySelectorAll("main button")].some(b => b.textContent.trim() === "Claim this need") && !document.querySelector('[aria-label="Account status"]')`), target)
  await clickButton(D3, "document.querySelector('main')", "Claim this need"); await sleep(200); await clickButton(D3, "document.querySelector('main')", "Yes, claim it")
  await D3.waitFor(`!!document.querySelector('main a[href^="mailto:"]')`, "claimed need with email"); await sleep(500)
  const claimedEmail = await D3.evaluate(`document.querySelector('main a[href^="mailto:"]').getAttribute("href")`)
  check("test.donor3 claims a need and sees the poster's email", /^mailto:test\.outreach\d@example\.com$/.test(claimedEmail), claimedEmail)

  // ---- 4. Revoke ----
  await admin.goto("/admin?tab=approved")
  await clickButton(admin, card(ORG_C), "Revoke approval"); await sleep(200)
  const revokeQ = await admin.evaluate(`(${card(ORG_C)}).querySelector('[role=group] p').textContent`)
  await clickButton(admin, card(ORG_C), "Yes, revoke")
  await admin.waitFor(`!${card(ORG_C)}`, "card leaves Approved"); await sleep(800)
  await admin.goto("/admin?tab=rejected")
  check("Revoke asks first, then moves the organization to Rejected", revokeQ.startsWith(`Revoke approval for ${ORG_C}?`) && await admin.evaluate(`!!${card(ORG_C)}`), revokeQ)
  await D3.goto("/board")
  const openHref = await D3.evaluate(`document.querySelector('main a[data-note="open"]')?.getAttribute("href")`)
  await D3.goto(openHref)
  const afterClaimable = await D3.evaluate(`({ claim: [...document.querySelectorAll("main button")].filter(b => b.textContent.trim() === "Claim this need").length, waiting: document.querySelector("main").innerText.includes("Available after approval.") })`)
  await D3.goto("/dashboard")
  const after = await D3.evaluate(`(() => { const html = document.documentElement.outerHTML; return { banner: document.querySelector('[aria-label="Account status"]')?.textContent.startsWith("Your organization wasn't approved."), claimStill: !!(${card(target)}), mailto: (html.match(/mailto:test\\.outreach/g) || []).length } })()`)
  check("After revoking: no Claim this need button (Available after approval instead), rejected banner shown", after.banner && afterClaimable.claim === 0 && afterClaimable.waiting, JSON.stringify({ ...after, ...afterClaimable }))
  check("After revoking: its claim is still listed but the poster's email is gone", after.claimStill && after.mailto === 0, JSON.stringify(after))

  // ---- 5. New sign-ups through the forms; reject with an internal note ----
  if (!suite.flags.signups) throw new Error("SKIP_SIGNUPS")
  const P = await browser.newTab()
  await P.goto("/sign-in?role=outreach")
  await P.fill("#panel-create", { displayName: "Signup C Poster", email: "signup.c-poster@example.com", password: PASSWORD, confirmPassword: PASSWORD, organizationName: "", pledge: true })
  await P.evaluate(`document.querySelector('#panel-create button[type=submit]').click(), true`)
  await P.waitFor(`location.pathname === "/dashboard" || !!document.querySelector('#panel-create [role=alert]')`, "poster sign-up"); await sleep(1000)
  check("New poster signs up through the form → outreach dashboard", await P.evaluate(`location.pathname === "/dashboard" && [...document.querySelectorAll("main h2")].some(h => h.textContent === "Your requests")`))
  const O = await browser.newTab()
  await O.goto("/sign-in?role=donor")
  await O.fill("#panel-create", { organizationName: "Signup C Org", website: "https://example.org/signup-c", ein: "", contactName: "Signup C Contact", email: "signup.c-org@example.com", password: PASSWORD, confirmPassword: PASSWORD, pledge: true })
  await O.evaluate(`document.querySelector('#panel-create button[type=submit]').click(), true`)
  await O.waitFor(`location.pathname === "/dashboard" || !!document.querySelector('#panel-create [role=alert]')`, "org sign-up"); await sleep(1000)
  check("New organization signs up through the form → pending dashboard", await O.evaluate(`!!document.querySelector('[aria-label="Account status"]')`))
  await admin.goto("/admin")
  const newPending = await admin.evaluate(`(() => { const c = ${card("Signup C Org")}; return c && { ein: [...c.querySelectorAll("dt")].some(d => d.textContent === "EIN"), email: c.innerText.includes("signup.c-org@example.com") } })()`)
  check("The new organization appears in the admin Pending tab (no EIN row, since none was given)", !!newPending && !newPending.ein && newPending.email, JSON.stringify(newPending))
  await clickButton(admin, card("Signup C Org"), "Reject"); await sleep(200)
  await admin.evaluate(`(() => { const t = (${card("Signup C Org")}).querySelector("textarea"); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set.call(t, "Website is a placeholder page."); t.dispatchEvent(new Event("input", { bubbles: true })); return true })()`)
  const counter = await admin.evaluate(`(${card("Signup C Org")}).querySelector('[id$="-count"]').textContent`)
  check("Reject has an optional internal note with a 300-character counter", counter === "30/300" && await admin.evaluate(`(${card("Signup C Org")}).querySelector("textarea").maxLength === 300`), counter)
  await clickButton(admin, card("Signup C Org"), "Yes, reject")
  await admin.waitFor(`!${card("Signup C Org")}`, "card leaves Pending"); await sleep(800)
  await admin.goto("/admin?tab=rejected")
  const rej = await admin.evaluate(`(() => { const c = ${card("Signup C Org")}; const f = (l) => [...c.querySelectorAll("dt")].find(d => d.textContent === l)?.nextElementSibling?.textContent; return c && { by: f("Reviewed by"), note: f("Internal note"), buttons: c.querySelectorAll("button").length } })()`)
  check("Rejected tab shows reviewer and the internal note; no buttons", rej?.by === "Test — Admin" && rej.note === "Website is a placeholder page." && rej.buttons === 0, JSON.stringify(rej))
  await O.goto("/dashboard")
  const orgView = await O.evaluate(`document.documentElement.outerHTML`)
  check("The rejected organization sees the banner but never the internal note", orgView.includes("Your organization wasn") && !orgView.includes("Website is a placeholder page."))
} catch (e) {
  if (e.message !== "SKIP_SIGNUPS") await finish(suite, browser, e)
  console.log("(Sign-ups through the forms skipped; add --signups to include them.)")
}
await finish(suite, browser)
