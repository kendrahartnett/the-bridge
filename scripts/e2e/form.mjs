// The Post a Need page: the privacy notice (exact wording, lock icon, above the form), text
// contrast for everything on the page, and no horizontal scroll, at 390px and 1280px in
// both themes.
//   npm run e2e:form

import { launchBrowser, sleep } from "./browser.mjs"
import { TEXT_CONTRAST } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"
import { NEW_REQUEST_COPY, copyFor } from "../../src/lib/copy.ts"

const suite = await setup("form")
const browser = await launchBrowser(suite)
const { check } = suite

try {
  const t = await browser.newTab({ log: true })
  await t.signIn("test.outreach1@example.com")
  for (const width of [390, 1280]) for (const theme of ["light", "dark"]) {
    const tag = `${theme} @${width}px`
    await t.size(width, 900)
    await t.goto("/requests/new"); await t.theme(theme); await t.reload(); await sleep(1200)
    await t.shot(`form-${theme}-${width}.png`)
    const n = await t.evaluate(`(() => { const a = document.querySelector("aside[aria-label=Privacy]"); if (!a) return null; const form = document.querySelector("main form"); return { text: a.innerText.trim(), lock: !!a.querySelector("svg.lucide-lock"), aboveForm: !!form && !!(a.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_FOLLOWING) } })()`)
    check(`${tag}: privacy notice shown, exact text, lock icon, above the form`, !!n && n.text === NEW_REQUEST_COPY.privacy && n.lock && n.aboveForm, n)
    const a = await t.evaluate(TEXT_CONTRAST)
    check(`${tag}: all text readable (${a.checked} elements)`, a.failures.length === 0, a.failures.join(" | "))
    check(`${tag}: no horizontal scroll`, (await t.evaluate("document.documentElement.scrollWidth")) <= width)
  }

  // A deterministic high-risk example stays blocked, so this tests the rewrite without
  // creating a request or making an Anthropic call. The address left in items must still
  // be screened on the next attempt after the notes suggestion is applied.
  const choose = async (index, label) => {
    await t.evaluate(`document.querySelectorAll('[role=combobox]')[${index}].click()`)
    await t.waitFor(`!![...document.querySelectorAll('[role=option]')].find(el => el.textContent?.trim() === ${JSON.stringify(label)})`, `option ${label}`)
    await t.evaluate(`[...document.querySelectorAll('[role=option]')].find(el => el.textContent?.trim() === ${JSON.stringify(label)}).click()`)
  }
  for (const lang of ["en", "es"]) for (const [width, theme] of [[390, "dark"], [1280, "light"]]) {
    const tag = `${lang} ${theme} @${width}px`
    const copy = copyFor(lang)
    await t.send("Network.setCookie", { name: "lang", value: lang, url: suite.base, sameSite: "Lax" })
    await t.size(width, 900)
    await t.goto("/requests/new"); await t.theme(theme); await t.reload()
    await t.setValue('[name=peopleCount]', "5")
    await choose(0, copy.LABELS.category.food)
    await t.setValue('[name=items]', "Food needed at 1234 Example Street")
    await t.setValue('[name=dietaryNotes]', "Apartment 4B needs delivery")
    await choose(1, "Armour Square")
    const day = new Date(Date.now() + 3 * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
    await t.setValue('[name=windowStart]', `${day}T10:00`)
    await t.setValue('[name=windowEnd]', `${day}T12:00`)
    await t.evaluate("document.querySelector('main form button[type=submit]').click()")
    await t.waitFor("!!document.querySelector('#privacy-result')", `${tag} privacy result`)
    const before = t.posts.length
    const buttonType = await t.evaluate(`(() => { const button = [...document.querySelectorAll('#privacy-result button')].find(el => el.textContent?.trim() === ${JSON.stringify(copy.PRIVACY_COPY.applySuggestion)}); button.focus(); return button.type })()`)
    await t.key("Enter", "Enter", 13)
    const state = await t.evaluate(`(() => ({ notes: document.querySelector('[name=dietaryNotes]').value, items: document.querySelector('[name=items]').value, people: document.querySelector('[name=peopleCount]').value, category: document.querySelectorAll('[role=combobox]')[0].textContent?.trim(), neighborhood: document.querySelectorAll('[role=combobox]')[1].textContent?.trim(), start: document.querySelector('[name=windowStart]').value, end: document.querySelector('[name=windowEnd]').value, focused: document.activeElement?.getAttribute('name'), reminder: document.querySelector('#privacy-result')?.textContent?.includes(${JSON.stringify(copy.PRIVACY_COPY.appliedIntro)}), horizontalScroll: document.documentElement.scrollWidth > innerWidth }))()`)
    check(`${tag}: keyboard applies exact suggestion to visible Notes`, state.notes === "Our outreach team needs food in Armour Square." && state.focused === "dietaryNotes")
    check(`${tag}: other fields remain unchanged`, state.items === "Food needed at 1234 Example Street" && state.people === "5" && state.category === copy.LABELS.category.food && state.neighborhood === "Armour Square" && state.start === `${day}T10:00` && state.end === `${day}T12:00`)
    check(`${tag}: applying does not submit and prompts review`, buttonType === "button" && t.posts.length === before && state.reminder && !state.horizontalScroll)
    await t.evaluate("document.querySelector('main form button[type=submit]').click()")
    await t.waitFor(`!!document.querySelector('#privacy-result') && document.querySelector('#privacy-result').textContent.includes(${JSON.stringify(copy.PRIVACY_COPY.category.exact_address)})`, `${tag} rescreened address`)
    check(`${tag}: revised attempt is screened again`, t.posts.length === before + 1 && new URL(await t.evaluate("location.href")).pathname === "/requests/new")
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
