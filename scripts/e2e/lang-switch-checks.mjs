// Checks for the EN / ES switch, shared by e2e:nav and e2e:spanish.
//   - measureSwitch: the visible size and the tap-target size of each option (the tap area
//     is extended with an invisible ::after), and whether the header stays on one row.
//   - checkTooltip: "English / Español" on hover and keyboard focus after the delay, hidden
//     on Escape and when the pointer leaves, hidden from screen readers and from clicks;
//     the options' accessible names (from Chrome's accessibility tree) stay "English" and
//     "Español".
//   - checkTap: at 320px, with touch, a tap on the other option in the phone menu switches
//     the language at once.

import { sleep } from "./browser.mjs"
import { lowestPixelContrast } from "./contrast.mjs"
import { copyFor } from "../../src/lib/copy.ts"

const TOOLTIP_TEXT = copyFor("en").UI.langTooltip

/** The switch that's showing (the header's from 640px; the phone menu's below, opened). */
const VISIBLE_SWITCH = `[...document.querySelectorAll("[data-lang-switch]")].find(g => g.getClientRects().length)`

export const MEASURE = `(() => {
  const g = ${VISIBLE_SWITCH}
  if (!g) return null
  const gr = g.getBoundingClientRect()
  const px = (v) => Math.min(0, v === "auto" ? 0 : parseFloat(v) || 0)
  const options = [...g.querySelectorAll("[role=radio]")].map(b => {
    const r = b.getBoundingClientRect(), a = getComputedStyle(b, "::after")
    return { name: b.getAttribute("aria-label"), visible: [Math.round(r.width), Math.round(r.height)], tap: [Math.round(r.width - px(a.left) - px(a.right)), Math.round(r.height - px(a.top) - px(a.bottom))] }
  })
  const header = document.querySelector("header.glass")
  const row = header ? [...header.querySelectorAll("a, button")].filter(e => e.getClientRects().length && !e.closest("ul[id]")).map(e => e.getBoundingClientRect()) : []
  return {
    inMenu: !!g.closest("ul[id]"), group: [Math.round(gr.width), Math.round(gr.height)], options,
    oneRow: row.every(r => Math.abs(r.top + r.height / 2 - (row[0].top + row[0].height / 2)) < 8),
    overflow: document.documentElement.scrollWidth > innerWidth,
  }
})()`

/** Opens the phone menu if the switch lives there (below 640px). */
export async function openMenuIfNeeded(t) {
  const inMenu = await t.evaluate(`!document.querySelector("header.glass > div > div > [data-lang-switch]")?.getClientRects().length && !!document.querySelector('header button[aria-controls]')?.getClientRects().length`)
  if (inMenu) { await t.evaluate(`document.querySelector('header button[aria-controls]').click(), true`); await sleep(350) }
  return inMenu
}

const TOOLTIP_STATE = `(() => { const g = ${VISIBLE_SWITCH}, tip = g?.querySelector("[data-lang-tooltip]"); if (!tip) return null; const cs = getComputedStyle(tip); return { shown: tip.hasAttribute("data-shown") && cs.visibility === "visible" && parseFloat(cs.opacity) > 0.9, text: tip.textContent.trim(), hidden: tip.getAttribute("aria-hidden"), events: cs.pointerEvents, inRadio: !!tip.closest("[role=radio]") } })()`

/** The accessible names Chrome computes for the two options (what screen readers announce). */
async function axNames(t) {
  const { root } = await t.send("DOM.getDocument", { depth: -1 })
  const { nodeIds } = await t.send("DOM.querySelectorAll", { nodeId: root.nodeId, selector: "[data-lang-switch] [role=radio]" })
  const names = []
  for (const nodeId of nodeIds) {
    const { nodes } = await t.send("Accessibility.getPartialAXTree", { nodeId, fetchRelatives: false })
    const node = nodes.find((n) => n.role?.value === "radio")
    if (node && !node.ignored) names.push(node.name?.value)
  }
  return [...new Set(names)]
}

export async function checkTooltip(t, check, tag) {
  await t.size(1280, 800)
  await t.goto("/", 900)
  const box = await t.evaluate(`(() => { const r = (${VISIBLE_SWITCH}).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  await t.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y })
  await sleep(100)
  const early = await t.evaluate(TOOLTIP_STATE)
  await sleep(400)
  const hover = await t.evaluate(TOOLTIP_STATE)
  check(`${tag}: tooltip waits ~300ms, then shows on hover: "${TOOLTIP_TEXT}", hidden from screen readers, takes no clicks`, !early.shown && hover.shown && hover.text === TOOLTIP_TEXT && hover.hidden === "true" && hover.events === "none" && !hover.inRadio, { early: early.shown, hover })
  await t.shot(`lang-tooltip-${tag.replace(/\W+/g, "-")}.png`)
  for (const theme of ["light", "dark"]) {
    await t.theme(theme); await t.goto("/", 700)
    await t.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y }); await sleep(600)
    const px = await lowestPixelContrast(t, "[data-lang-switch] [data-lang-tooltip]")
    check(`${tag} · ${theme}: tooltip text at least 4.5:1 on its surface (${px.worst}:1)`, px.worst >= 4.5, px)
    await t.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 400 }); await sleep(150)
  }
  await t.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 400 }); await sleep(150)
  check(`${tag}: tooltip hides when the pointer leaves`, !(await t.evaluate(TOOLTIP_STATE)).shown)
  // Keyboard: focus the chosen option, then Escape.
  await t.evaluate(`(${VISIBLE_SWITCH}).querySelector("[aria-checked=true]").focus(), true`); await sleep(450)
  const focus = await t.evaluate(TOOLTIP_STATE)
  await t.key("Escape", "Escape", 27); await sleep(150)
  const afterEsc = await t.evaluate(TOOLTIP_STATE)
  const stillFocused = await t.evaluate(`document.activeElement?.getAttribute("role") === "radio"`)
  check(`${tag}: tooltip shows on keyboard focus; Escape hides it and keeps focus`, focus.shown && focus.text === TOOLTIP_TEXT && !afterEsc.shown && stillFocused, { focus: focus.shown, afterEscape: afterEsc.shown, stillFocused })
  await t.evaluate("document.activeElement?.blur(), true")
  const names = await axNames(t)
  check(`${tag}: screen readers announce "English" and "Español" (not the tooltip); the group is named`, JSON.stringify(names) === '["English","Español"]' && (await t.evaluate(`(${VISIBLE_SWITCH}).getAttribute("role") === "radiogroup" && !!(${VISIBLE_SWITCH}).getAttribute("aria-label")`)), names)
}

/** At 320px, with touch: a tap on the other option in the phone menu switches at once. */
export async function checkTap(t, check, from, to) {
  await t.size(320, 700)
  await t.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 })
  await t.goto("/", 900)
  await openMenuIfNeeded(t)
  const target = await t.evaluate(`(() => { const b = [...(${VISIBLE_SWITCH}).querySelectorAll("[role=radio]")].find(b => b.getAttribute("aria-checked") === "false"); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: b.textContent } })()`)
  await t.evaluate("window.__beforeTap = true")
  const t0 = Date.now()
  await t.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: target.x, y: target.y }] })
  await t.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
  await t.waitFor(`!window.__beforeTap && document.readyState === "complete" && document.documentElement.lang === "${to}"`, `language ${to} after a tap`)
  const ms = Date.now() - t0
  check(`${from.toUpperCase()} → ${to.toUpperCase()} at 320px: a tap on "${target.text}" in the menu switches the language right away (the tooltip doesn't get in the way)`, true, `${ms}ms to the reloaded page`)
  await t.send("Emulation.setTouchEmulationEnabled", { enabled: false })
  await sleep(300)
}
