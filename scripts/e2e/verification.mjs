// Organization verification: /admin is a real 404 for everyone but admins (with no admin
// data in the HTML), the review page's details and links, approve / revoke and their
// effect on claiming and contact emails.
//   npm run e2e:verification
//   npm run e2e:verification -- --signups   also signs up a new poster and organization
//     through the forms and rejects the organization with a note. This creates two accounts
//     on the-bridge-dev (signup.c-poster@example.com, signup.c-org@example.com) that reseeding
//     doesn't remove, so it only works once until they're deleted.

import { launchBrowser, sleep } from "./browser.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("verification")
const browser = await launchBrowser(suite)
const { check, sql, password: PASSWORD } = suite

// Things only an admin should ever see.
const ADMIN_MARKERS = ["Organization review", "IRS Tax Exempt", "00-1234567", "example.org/organization-c", "Test — Contact C", "test.donor3@example.com", "Revoke approval"]
const markersIn = (html, except = []) => ADMIN_MARKERS.filter((m) => !except.includes(m) && html.includes(m))
const NOT_FOUND = `document.body.innerText.includes("This page could not be found") && !document.querySelector("main h1")?.textContent.includes("Organization review")`
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
  // A pending organization's dashboard never contains anyone's email but its own.
  const pendingHtml = await who.donor3.evaluate("document.documentElement.outerHTML")
  const otherEmails = (pendingHtml.match(/[a-z0-9.+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).filter((e) => e.toLowerCase() !== "test.donor3@example.com")
  check("Pending organization's dashboard HTML has no poster's email (or anyone else's)", otherEmails.length === 0 && !pendingHtml.includes("mailto:"), otherEmails.join(", ") || "none")

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
  await D3.goto("/dashboard")
  const target = await D3.evaluate(`[...document.querySelectorAll("main [data-slot=card]")].find(c => [...c.querySelectorAll("button")].some(b => b.textContent.trim() === "Offer support"))?.querySelector("[data-slot=card-title]").textContent`)
  check("Approved test.donor3 now sees Offer support", !!target && !(await D3.evaluate(`!!document.querySelector('[aria-label="Account status"]')`)), target)
  await clickButton(D3, card(target), "Offer support"); await sleep(200); await clickButton(D3, card(target), "Yes, offer support")
  await D3.waitFor(`!!(${card(target)})?.querySelector('a[href^="mailto:"]')`, "claimed card with email"); await sleep(500)
  const claimedEmail = await D3.evaluate(`(${card(target)}).querySelector('a[href^="mailto:"]').getAttribute("href")`)
  check("test.donor3 claims a need and sees the poster's email", /^mailto:test\.outreach\d@example\.com$/.test(claimedEmail), claimedEmail)

  // ---- 4. Revoke ----
  await admin.goto("/admin?tab=approved")
  await clickButton(admin, card(ORG_C), "Revoke approval"); await sleep(200)
  const revokeQ = await admin.evaluate(`(${card(ORG_C)}).querySelector('[role=group] p').textContent`)
  await clickButton(admin, card(ORG_C), "Yes, revoke")
  await admin.waitFor(`!${card(ORG_C)}`, "card leaves Approved"); await sleep(800)
  await admin.goto("/admin?tab=rejected")
  check("Revoke asks first, then moves the organization to Rejected", revokeQ.startsWith(`Revoke approval for ${ORG_C}?`) && await admin.evaluate(`!!${card(ORG_C)}`), revokeQ)
  await D3.goto("/dashboard")
  const after = await D3.evaluate(`(() => { const html = document.documentElement.outerHTML; return { banner: document.querySelector('[aria-label="Account status"]')?.textContent.startsWith("Your organization wasn't approved."), offer: [...document.querySelectorAll("main button")].filter(b => b.textContent.trim() === "Offer support").length, claimStill: !!(${card(target)}), mailto: (html.match(/mailto:test\\.outreach/g) || []).length } })()`)
  check("After revoking: claim buttons gone, rejected banner shown", after.banner && after.offer === 0, JSON.stringify(after))
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
