// The chat panel: the launcher never covers a control while scrolling, and the panel's
// layout, labels, focus handling, keyboard use, contrast, limits, and reduced motion, on
// the landing page and signed-in pages, at phone and desktop widths in both themes. Also
// the chat button's tooltip and one-time phone hint, and the "Thinking…" state and reply
// bubbles (with the chat request intercepted, so no AI call is made).
//   npm run e2e:panel
//   npm run e2e:panel -- --live   also sends one real question to the assistant (uses the
//                                 Anthropic API key in .env.local)

import { launchBrowser, sleep } from "./browser.mjs"
import { lowestPixelContrast } from "./contrast.mjs"
import { finish, setup } from "./harness.ts"

const suite = await setup("panel")
const browser = await launchBrowser(suite)
const { check } = suite
const LIVE = !!suite.flags.live

const tab = await browser.newTab({ scale: 2, log: true })
const { send, evaluate, waitFor, goto, key, shot, setValue, signIn } = tab
const setViewport = (w, h) => tab.size(w, h)
const setMedia = (scheme, motion) => tab.media(scheme, motion)
const setTheme = async (t) => { await tab.theme(t); await goto(await evaluate("location.pathname")) }

try {
  const L = `document.querySelector("[data-assistant-launcher]")`
  const P = `document.querySelector("[data-assistant-panel]")`

  // For each button/link in <main>: is it covered by the chat button at load, and can it be
  // scrolled to a spot clear of it? Also: at the very bottom of the page, nothing interactive
  // sits under the chat button.
  // Scroll through the page in small steps. At each stop: if the chat button is visible, it
  // must not overlap any visible button, link, or field. Also count stops where it is visible.
  const OVERLAP = `(async () => {
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
    const L = ${L}
    const wait = (ms) => new Promise(r => setTimeout(r, ms))
    const max = document.documentElement.scrollHeight - innerHeight
    const step = Math.max(40, Math.round(innerHeight / 6))
    const stops = []; for (let y = 0; y < max; y += step) stops.push(y); stops.push(max)
    const violations = [], hidden = []; let visible = 0
    const controls = [...document.querySelectorAll("a, button, input, select, textarea, [role=combobox]")].filter(e => e !== L)
    for (const y of stops) {
      window.scrollTo(0, y); await wait(260)
      const r = L.getBoundingClientRect()
      const under = controls.filter(e => e.getClientRects().length && hit(e.getBoundingClientRect(), r)).map(e => (e.textContent.trim() || e.getAttribute("aria-label") || e.name || e.tagName).slice(0, 30))
      const shown = parseFloat(getComputedStyle(L).opacity) > 0.5
      if (shown) visible++
      if (shown && under.length) violations.push(y + ":" + under.join("/"))
      if (!shown) hidden.push(y)
    }
    window.scrollTo(0, 0); await wait(260)
    return { stops: stops.length, visible, hiddenAt: hidden, violations, atTopVisible: parseFloat(getComputedStyle(L).opacity) > 0.5 }
  })()`

  const CONTRAST = `(() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1
    const ctx = cv.getContext("2d", { willReadFrequently: true })
    const rgba = (c) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = "rgba(0,0,0,0)"; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); const d = ctx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255] }
    const over = (t, u) => [0, 1, 2].map(i => t[i] * t[3] + u[i] * (1 - t[3])).concat(1)
    const lum = (c) => { const v = c.slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
    // Worst case for the translucent panel: its fill over pure black or pure white page
    // content (whichever is worse), plus any layers inside it.
    const out = []
    const panel = ${P}
    for (const el of panel.querySelectorAll("*")) {
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      const ph = el.tagName === "INPUT" && !el.value
      if (!(own || ph) || !el.getClientRects().length) continue
      const layers = []
      for (let n = el; n; n = n.parentElement) { const c = rgba(getComputedStyle(n).backgroundColor); if (c[3] > 0) layers.push(c); if (n === panel || c[3] >= 1) break }
      let worst = Infinity
      for (const base of [[0,0,0,1],[255,255,255,1]]) {
        let bg = base; for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg)
        const fg = over(rgba(getComputedStyle(el, ph ? "::placeholder" : null).color), bg)
        worst = Math.min(worst, ratio(fg, bg))
      }
      const size = parseFloat(getComputedStyle(el).fontSize), bold = +getComputedStyle(el).fontWeight >= 700
      const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5
      out.push({ text: (ph ? "[placeholder] " + el.placeholder : el.textContent.trim()).slice(0, 40), ratio: +worst.toFixed(2), need })
    }
    return out
  })()`

  async function panelChecks(label, w) {
    await waitFor(`!!${L}`, "launcher")
    await evaluate(`window.scrollTo(0, document.documentElement.scrollHeight), true`); await sleep(400)
    const lr = await evaluate(`(() => { const r = ${L}.getBoundingClientRect(); return { w: r.width, h: r.height, right: document.documentElement.clientWidth - r.right, bottom: innerHeight - r.bottom } })()`)
    check(`${label}: chat button in the bottom-right corner, at least 44px`, lr.w >= 44 && lr.h >= 44 && lr.right <= 24 && lr.bottom <= 24, JSON.stringify(lr))
    const name = await evaluate(`${L}.getAttribute("aria-label")`)
    check(`${label}: chat button has an accessible name`, name === "Ask The Bridge assistant", name)

    // Open with the keyboard.
    await evaluate(`${L}.focus(), true`); await key("Enter", "Enter", 13); await sleep(400)
    await waitFor(`!!${P}`, "panel")
    const pr = await evaluate(`(() => { const r = ${P}.getBoundingClientRect(); return { left: r.left, right: document.documentElement.clientWidth - r.right, bottom: innerHeight - r.bottom, w: r.width, h: r.height, vh: innerHeight, vw: document.documentElement.clientWidth } })()`)
    if (w < 640) check(`${label}: opens as a full-width bottom sheet, max 85% of the screen height`, Math.abs(pr.w - pr.vw) < 1 && Math.abs(pr.bottom) < 1 && pr.h <= pr.vh * 0.85 + 1, JSON.stringify(pr))
    else check(`${label}: opens as a corner panel`, pr.w === 384 && pr.right === 16 && pr.bottom === 16, JSON.stringify(pr))
    check(`${label}: panel fits on screen`, pr.left >= 0 && pr.h <= pr.vh, JSON.stringify(pr))
    const info = await evaluate(`(() => {
      const p = ${P}, r = p.getBoundingClientRect()
      const notice = [...p.querySelectorAll("p")].find(e => e.textContent === "You're chatting with an AI assistant. Don't share personal details.")
      const crisis = [...p.querySelectorAll("p")].find(e => e.textContent === "In crisis? Call or text 988.")
      const input = p.querySelector("input")
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.top >= 0 && b.bottom <= innerHeight }
      const targets = [...p.querySelectorAll("button, input")].map(e => { const b = e.getBoundingClientRect(); return { t: e.textContent.trim() || e.getAttribute("aria-label") || e.tagName, w: Math.round(b.width), h: Math.round(b.height) } })
      return {
        role: p.getAttribute("role"), labelled: document.getElementById(p.getAttribute("aria-labelledby"))?.textContent,
        notice: !!notice && vis(notice), noticeTop: notice && notice.getBoundingClientRect().top - r.top,
        crisis: !!crisis && vis(crisis), crisisBottom: crisis && r.bottom - crisis.getBoundingClientRect().bottom,
        starters: [...p.querySelectorAll("button")].map(b => b.textContent.trim()).filter(Boolean),
        inputFont: parseFloat(getComputedStyle(input).fontSize), inputVisible: vis(input), placeholder: input.placeholder,
        focusInInput: document.activeElement === input, small: targets.filter(x => x.w < 44 || x.h < 44),
        inputName: input.labels?.[0]?.textContent,
      }
    })()`)
    check(`${label}: panel is a labelled dialog`, info.role === "dialog" && info.labelled === "The Bridge assistant", `${info.role} "${info.labelled}"`)
    check(`${label}: AI notice visible at the top`, info.notice && info.noticeTop < 80, `top offset ${info.noticeTop}px`)
    check(`${label}: 988 line visible at the bottom`, info.crisis && info.crisisBottom < 40, `bottom offset ${info.crisisBottom}px`)
    check(`${label}: three starter buttons`, JSON.stringify(info.starters) === JSON.stringify(["What is The Bridge?", "How do I post a need?", "How do organizations offer support?"]), info.starters.join(" | "))
    check(`${label}: input is visible, labelled, 16px or larger`, info.inputVisible && info.inputFont >= 16 && info.inputName === "Your question", `${info.inputFont}px "${info.inputName}" placeholder "${info.placeholder}"`)
    check(`${label}: focus moves into the input on open`, info.focusInInput)
    check(`${label}: every panel control is at least 44x44`, info.small.length === 0, JSON.stringify(info.small))
    const contrast = await evaluate(CONTRAST)
    const bad = contrast.filter(c => c.ratio < c.need)
    check(`${label}: panel text contrast (worst case over black or white content)`, bad.length === 0, bad.length ? JSON.stringify(bad) : `min ${Math.min(...contrast.map(c => c.ratio))}:1 over ${contrast.length} items`)

    // Keyboard: Tab reaches the starters and the close button.
    const order = []
    for (let i = 0; i < 7; i++) { await key("Tab", "Tab", 9); order.push(await evaluate(`(() => { const a = document.activeElement; return ${P}?.contains(a) ? (a.textContent.trim() || a.getAttribute("aria-label") || a.tagName) : "outside:" + a.tagName })()`)) }
    check(`${label}: Tab moves through the panel controls`, order.includes("Close the assistant") && order.includes("What is The Bridge?") && order.every(o => !o.startsWith("outside")), order.join(" → "))
    await shot(`${label.replace(/\W+/g, "-")}-open.png`)

    // Escape closes, focus returns to the chat button.
    await evaluate(`${P}.querySelector("input").focus(), true`); await key("Escape", "Escape", 27); await sleep(300)
    check(`${label}: Escape closes; focus returns to the chat button`, await evaluate(`!${P} && document.activeElement === ${L}`), await evaluate(`document.activeElement?.outerHTML.slice(0, 60)`))
    await evaluate(`${L}.click(), true`); await sleep(300)
    await evaluate(`${P}.querySelector('button[aria-label="Close the assistant"]').click(), true`); await sleep(300)
    check(`${label}: close button closes; focus returns to the chat button`, await evaluate(`!${P} && document.activeElement === ${L}`))
  }

  const VIEWS = [["320", 320, 568], ["360", 360, 640], ["390", 390, 844], ["1280", 1280, 800]]
  await setMedia("dark")
  await goto("/")
  for (const theme of ["dark", "light"]) {
    await setTheme(theme)
    for (const [n, w, h] of VIEWS) {
      await setViewport(w, h); await goto("/")
      const label = `landing ${n}px ${theme}`
      const o = await evaluate(OVERLAP)
      check(`${label}: chat button never visible on top of a button, link, or field (${o.stops} scroll stops; visible at ${o.visible})`, o.violations.length === 0 && o.visible > 0, JSON.stringify(o))
      await panelChecks(label, w)
    }
  }

  // Reduced motion: no animation on the panel.
  await setViewport(390, 844); await setMedia("dark", "reduce"); await setTheme("dark")
  await evaluate(`${L}.click(), true`); await sleep(100)
  const anim = await evaluate(`(() => { const cs = getComputedStyle(${P}); return { name: cs.animationName, dur: cs.animationDuration } })()`)
  check("Reduced motion: panel opens without animation", anim.name === "none" || parseFloat(anim.dur) < 0.001, JSON.stringify(anim))
  await key("Escape", "Escape", 27); await setMedia("dark")

  // Client-side limits (nothing is sent for these).
  await goto("/"); await evaluate(`${L}.click(), true`); await sleep(200)
  await setValue("[data-assistant-panel] input", "x".repeat(501))
  const counter = await evaluate(`${P}.innerText.match(/-?\\d+ characters left/)?.[0]`)
  await evaluate(`${P}.querySelector("form").requestSubmit(), true`); await sleep(300)
  check("Over 500 characters: clear error, nothing sent", await evaluate(`${P}.querySelector('[role=alert]')?.textContent === "That message is too long. Please keep it under 500 characters." && ${P}.querySelectorAll("ol li").length === 0`), counter)
  await setValue("[data-assistant-panel] input", "   ")
  await evaluate(`${P}.querySelector("form").requestSubmit(), true`); await sleep(300)
  check("Empty question: clear error", await evaluate(`${P}.querySelector('[role=alert]')?.textContent === "Please type a question first."`))

  if (LIVE) {
    await setValue("[data-assistant-panel] input", "")
    await evaluate(`[...${P}.querySelectorAll("button")].find(b => b.textContent === "What is The Bridge?").click(), true`)
    await waitFor(`${P}.querySelectorAll("ol li").length === 2`, "reply", 30000)
    const convo = await evaluate(`[...${P}.querySelectorAll("ol li > span:last-child")].map(s => s.textContent)`)
    check("Starter button sends the question and shows the reply", convo[0] === "What is The Bridge?" && convo[1].length > 20, convo[1].slice(0, 120).replace(/\n/g, " ") + "…")
    check("Questions-left counter counts down", await evaluate(`${P}.innerText.includes("9 of 10 questions left")`))
    check("Starters hide once the chat begins; focus back in the input", await evaluate(`![...${P}.querySelectorAll("button")].some(b => b.textContent === "How do I post a need?") && document.activeElement === ${P}.querySelector("input")`))
    await shot("live-reply-390-dark.png")
  }

  // ---- Chat button tooltip (hover and keyboard focus) ----
  const TIP = `document.querySelector("[data-assistant-tooltip]")`
  const tipState = `(() => { const t = ${TIP}, b = ${L}; if (!t || !b) return null; const r = t.getBoundingClientRect(), br = b.getBoundingClientRect(); return { shown: t.hasAttribute("data-shown") && getComputedStyle(t).visibility === "visible", text: t.textContent, label: b.getAttribute("aria-label"), hidden: t.getAttribute("aria-hidden"), left: r.left, right: r.right, buttonLeft: br.left, onScreen: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight } })()`
  const center = async () => evaluate(`(() => { const r = ${L}.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })()`)
  for (const theme of ["dark", "light"]) {
    await setViewport(1280, 800); await setTheme(theme)
    await evaluate(`window.scrollTo(0, document.documentElement.scrollHeight), true`); await sleep(500)
    const c = await center()
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y })
    await sleep(100)
    const early = await evaluate(tipState)
    await sleep(450)
    const hover = await evaluate(tipState)
    check(`${theme} 1280px: tooltip waits ~300ms, then shows on hover with the button's name, left of the button, on screen`, !early.shown && hover.shown && hover.text === "Ask The Bridge assistant" && hover.label === hover.text && hover.hidden === "true" && hover.right <= hover.buttonLeft && hover.onScreen, hover)
    // Screenshot first: the contrast measurement hides the chat button, so the pointer
    // "leaves" it and the tooltip (correctly) hides.
    if (theme === "dark") await shot("tooltip-hover-dark-1280.png")
    const tipContrast = await lowestPixelContrast(tab, "[data-assistant-tooltip]")
    check(`${theme} 1280px: tooltip text at least 4.5:1`, tipContrast.worst >= 4.5, `${tipContrast.worst}:1`)
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 20, y: 20 }); await sleep(350)
    check(`${theme} 1280px: tooltip hides when the pointer leaves`, !(await evaluate(tipState)).shown)
    await evaluate(`${L}.focus(), true`); await sleep(450)
    check(`${theme} 1280px: tooltip shows on keyboard focus`, (await evaluate(tipState)).shown)
    await key("Escape", "Escape", 27); await sleep(250)
    const afterEsc = await evaluate(`({ tip: ${tipState}, focused: document.activeElement === ${L} })`)
    check(`${theme} 1280px: Escape hides the tooltip and keeps focus on the button`, !afterEsc.tip.shown && afterEsc.focused, afterEsc)
    await evaluate(`${L}.blur(), true`)
  }

  // ---- Phone hint: "Ask a question", first visit only ----
  const HINT = `(() => { const h = document.querySelector("[data-assistant-hint]"); return h && { shown: h.hasAttribute("data-shown") && getComputedStyle(h).visibility === "visible", text: h.textContent, hidden: h.getAttribute("aria-hidden") } })()`
  const fresh = await browser.newTab({ width: 390, height: 844, scale: 2 })
  await fresh.goto("/", 300); await sleep(400)
  const firstVisit = await fresh.evaluate(HINT)
  check("390px first visit: the \"Ask a question\" hint shows beside the chat button", firstVisit?.shown && firstVisit.text === "Ask a question" && firstVisit.hidden === "true", firstVisit)
  await fresh.shot("hint-first-visit-390.png")
  await sleep(5200)
  check("390px: the hint fades out after 5 seconds", !(await fresh.evaluate(HINT)).shown)
  await fresh.reload(400)
  check("390px: after a reload the hint does not show again", !(await fresh.evaluate(HINT)).shown)
  const desk = await browser.newTab({ width: 1280, height: 800 })
  await desk.goto("/", 400)
  check("1280px first visit: no phone hint", !(await desk.evaluate(HINT)).shown)
  // First tap anywhere dismisses it.
  const tap = await browser.newTab({ width: 390, height: 844, scale: 2 })
  await tap.goto("/", 300); await sleep(300)
  await tap.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 100, y: 300 }] })
  await tap.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); await sleep(400)
  check("390px: the first tap dismisses the hint", !(await tap.evaluate(HINT)).shown)

  // ---- "Thinking…" and a reply (the chat request is intercepted: no AI call) ----
  const REPLY = "The Bridge connects Chicago outreach workers with local organizations. Outreach workers post what's needed, like food, clothing, or hygiene supplies, and nearby organizations offer support."
  let hold = null
  tab.onEvent((m) => {
    if (m.method !== "Fetch.requestPaused") return
    const fulfill = () => send("Fetch.fulfillRequest", { requestId: m.params.requestId, responseCode: 200, responseHeaders: [{ name: "content-type", value: "application/json" }], body: Buffer.from(JSON.stringify({ reply: REPLY })).toString("base64") })
    if (hold) hold.push(fulfill)
    else fulfill()
  })
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/chat*" }] })
  for (const [w, h] of [[390, 844], [1280, 800], [320, 568]]) {
    for (const theme of ["dark", "light"]) {
      await setViewport(w, h); await setTheme(theme)
      await evaluate(`${L}.click(), true`); await sleep(300)
      hold = []
      await evaluate(`[...${P}.querySelectorAll("button")].find(b => b.textContent === "What is The Bridge?").click(), true`)
      await waitFor(`!!${P}.querySelector("[role=status]")`, "thinking")
      const think = await evaluate(`(() => { const s = ${P}.querySelector("[role=status]"); const svg = s.querySelector("svg"); return { text: s.textContent.trim(), svgHidden: svg?.getAttribute("aria-hidden"), anim: svg && getComputedStyle(svg.querySelector("path")).animationName } })()`)
      check(`${theme} ${w}px: "Thinking…" keeps its status role and text; the arch is hidden from screen readers`, think.text === "Thinking…" && think.svgHidden === "true" && think.anim === "arch-loop", think)
      if (theme === "dark" && w !== 320) await shot(`thinking-dark-${w}.png`)
      for (const f of hold) await f()
      hold = null
      await waitFor(`${P}.querySelectorAll("ol li").length === 2`, "reply")
      await sleep(300)
      const lay = await evaluate(`(() => { const p = ${P}.getBoundingClientRect(); return [...${P}.querySelectorAll("ol li")].map(li => { const r = li.getBoundingClientRect(); return { inside: r.left >= p.left - 0.5 && r.right <= p.right + 0.5, radius: getComputedStyle(li).borderRadius } }) })()`)
      check(`${theme} ${w}px: both bubbles inside the panel (tail is a corner radius only)`, lay.length === 2 && lay.every((b) => b.inside), lay)
      const replyContrast = await lowestPixelContrast(tab, "[data-assistant-panel] ol li:last-child")
      check(`${theme} ${w}px: reply text at least 4.5:1 on the raised surface`, replyContrast.worst >= 4.5, `${replyContrast.worst}:1`)
      if (theme === "dark" && w !== 320) await shot(`reply-dark-${w}.png`)
      await key("Escape", "Escape", 27); await sleep(300)
      await goto("/")
    }
  }
  await send("Fetch.disable")

  // Signed-in pages.
  for (const [email, role, path] of [["test.donor1@example.com", "donor", "/dashboard"], ["test.outreach1@example.com", "outreach", "/requests/new"], ["test.outreach1@example.com", "outreach", "/dashboard"]]) {
    await setViewport(390, 844)
    await send("Network.clearBrowserCookies")
    await signIn(email)
    for (const [n, w, h] of VIEWS) {
      await setViewport(w, h); await goto(path)
      const label = `${path} (${role}) ${n}px`
      const o = await evaluate(OVERLAP)
      check(`${label}: chat button present`, await evaluate(`!!${L}`))
      check(`${label}: chat button never visible on top of a button, link, or field (${o.stops} scroll stops; visible at ${o.visible})`, o.violations.length === 0 && o.visible > 0, JSON.stringify(o))
      if (n === "320") await panelChecks(label, w)
    }
  }
} catch (e) {
  await finish(suite, browser, e)
}
await finish(suite, browser)
