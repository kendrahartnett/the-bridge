// Headless Chrome over the DevTools protocol, with no dependencies. Each tab gets its own
// browser context (its own cookies), so several signed-in accounts can run side by side.
// Chrome is found at CHROME_PATH, or the usual install location for the platform.

import { spawn } from "node:child_process"
import fs, { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { AUTH_ERRORS } from "../../src/lib/copy.ts"
import { redact } from "../../src/lib/redact.ts"
import { timeoutMessage, withTimeout } from "./harness.ts"

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SLOW_CALLS = new Set(["Runtime.evaluate", "Page.captureScreenshot"])

/** A call's name for error messages: the path for navigation, the start of a page script. */
function describeCall(method, params) {
  if (method === "Page.navigate") return `${method} ${new URL(params.url).pathname}${new URL(params.url).search}`
  if (method === "Runtime.evaluate") return `${method} (${params.expression.replace(/\s+/g, " ").trim().slice(0, 70)}…)`
  return method
}

const DEFAULT_CHROME = {
  win32: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "google-chrome",
}

/** @param {{ base: string, password: string, outDir: string }} suite */
export async function launchBrowser(suite) {
  const profile = mkdtempSync(join(tmpdir(), "bridge-e2e-"))
  const chrome = spawn(
    process.env.CHROME_PATH ?? DEFAULT_CHROME[process.platform] ?? "google-chrome",
    ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "about:blank"],
    { stdio: "ignore" }
  )
  // Chrome picks a free port and writes it to DevToolsActivePort in the profile folder.
  let wsUrl
  for (let i = 0; i < 100 && !wsUrl; i++) {
    try {
      const [port, path] = fs.readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")
      wsUrl = `ws://127.0.0.1:${port.trim()}${path.trim()}`
    } catch {
      await sleep(100)
    }
  }
  if (!wsUrl) throw new Error("Chrome didn't start. Set CHROME_PATH to your Chrome executable.")
  const ws = new WebSocket(wsUrl)
  await withTimeout(new Promise((r) => ws.addEventListener("open", r, { once: true })), 15_000, "Connecting to Chrome")

  let seq = 0
  const pending = new Map()
  const listeners = []
  const consoleErrors = []
  const noteError = (text) => consoleErrors.push(redact(text).slice(0, 300))
  ws.addEventListener("message", (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id)
      pending.delete(m.id)
      if (m.error) p.reject(new Error(JSON.stringify(m.error)))
      else p.resolve(m.result)
      return
    }
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(m.params.type))
      noteError(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description).join(" ")}`)
    if (m.method === "Runtime.exceptionThrown")
      noteError(`exception: ${m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text}`)
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") noteError(`log: ${m.params.entry.text}`)
    for (const l of listeners) l(m)
  })
  // If Chrome goes away, every call still waiting fails instead of hanging.
  ws.addEventListener("close", () => {
    for (const p of pending.values()) p.reject(new Error("Chrome closed the DevTools connection"))
    pending.clear()
  })
  // Every call has a time limit (60s for page scripts and screenshots, which can be slow;
  // 30s otherwise). The error names the call and, for navigation and scripts, what it was.
  const raw = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq
      const ms = SLOW_CALLS.has(method) ? 60_000 : 30_000
      const startedAt = Date.now()
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(redact(timeoutMessage(`DevTools call ${describeCall(method, params)}`, ms, startedAt))))
      }, ms)
      pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v) },
        reject: (e) => { clearTimeout(timer); reject(e) },
      })
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }))
    })

  /**
   * Opens a tab in a fresh browser context.
   * log: also count browser log errors (failed resource loads) as console errors.
   */
  async function newTab({ width = 390, height = 844, scale = 1, log = false, noScript = false } = {}) {
    const { browserContextId } = await raw("Target.createBrowserContext")
    const { targetId } = await raw("Target.createTarget", { url: "about:blank", browserContextId })
    const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true })
    const send = (m, p) => raw(m, p, sessionId)
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable")
    await send("DOM.enable"); await send("Accessibility.enable")
    if (log) await send("Log.enable")
    if (noScript) await send("Emulation.setScriptExecutionDisabled", { value: true })
    // POST requests sent, and the type each image actually arrived as.
    const posts = [], images = []
    listeners.push((m) => {
      if (m.sessionId !== sessionId) return
      if (m.method === "Network.requestWillBeSent" && m.params.request.method === "POST") posts.push(m.params.request.url)
      if (m.method === "Network.responseReceived" && m.params.type === "Image") images.push({ url: m.params.response.url, mimeType: m.params.response.mimeType })
    })

    const evaluate = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text)
      return r.result.value
    }
    const waitFor = async (expr, label, timeout = 30000) => {
      const start = Date.now()
      while (Date.now() - start < timeout) {
        try { if (await evaluate(expr)) return } catch { /* page still loading */ }
        await sleep(200)
      }
      throw new Error(`Timed out: ${label}`)
    }
    // Waits for the new page, not the old one: the old document is marked first, so a
    // "complete" readyState only counts once the marker is gone. A page that takes over 8s
    // is reported, so a slow server shows up by name instead of as a later stall.
    const loadPage = async (start, label, settle) => {
      await evaluate("window.__e2eOldPage = true").catch(() => {})
      const t0 = Date.now()
      await start()
      await waitFor(`!window.__e2eOldPage && document.readyState === "complete"`, `loading ${label}`)
      const ms = Date.now() - t0
      if (ms > 8000) console.log(`(slow page: ${label} took ${(ms / 1000).toFixed(1)}s)`)
      await sleep(settle)
    }
    const goto = (path, settle = 1300) => loadPage(() => send("Page.navigate", { url: suite.base + path }), path, settle)
    const reload = (settle = 1300) => loadPage(() => send("Page.reload", {}), "reload", settle)
    /** Viewport: phones (under 640px) are emulated as mobile. */
    const size = (w, h = w < 640 ? 640 : 900, s = scale) =>
      send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: s, mobile: w < 640 })
    const media = (scheme, motion = "no-preference") =>
      send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }, { name: "prefers-reduced-motion", value: motion }] })
    /** Stores the theme choice; it applies on the next page load. */
    const theme = (t) => evaluate(`localStorage.setItem("theme", "${t}"), true`)
    const key = async (k, code, keyCode) => {
      for (const type of ["keyDown", "keyUp"])
        await send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, ...(type === "keyDown" && k === "Enter" ? { text: "\r" } : {}) })
    }
    const shot = async (file, { full = false } = {}) => {
      const params = { format: "png" }
      if (full) {
        const { cssContentSize } = await send("Page.getLayoutMetrics")
        Object.assign(params, { captureBeyondViewport: true, clip: { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 } })
      }
      const { data } = await send("Page.captureScreenshot", params)
      fs.writeFileSync(join(suite.outDir, file), Buffer.from(data, "base64"))
    }
    /** Sets a field's value the way typing does (React sees the input event). */
    const setValue = (selector, value) => evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)})
      if (!el) throw new Error("no field ${selector.replaceAll('"', "'")}")
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)})
      el.dispatchEvent(new Event("input", { bubbles: true }))
      return true
    })()`)
    /** Fills fields inside a container by name. Checkboxes take true/false. */
    const fill = (scope, values) => evaluate(`(() => {
      const root = document.querySelector(${JSON.stringify(scope)})
      for (const [name, v] of Object.entries(${JSON.stringify(values)})) {
        const el = root.querySelector('[name="' + name + '"]')
        if (!el) throw new Error("no field " + name)
        if (el.type === "checkbox") { if (el.checked !== v) el.click(); continue }
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(el, v)
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }
      return true
    })()`)
    /**
     * Signs in on the Sign in tab; throws with the form's message if it shows one. Neon Auth
     * rate-limits sign-ins, and a full run signs in dozens of times, so "Too many attempts"
     * waits and tries again (up to 4 times).
     */
    const signIn = async (email, password = suite.password) => {
      for (let attempt = 1; ; attempt++) {
        await goto("/sign-in")
        await fill("#panel-sign-in", { email, password })
        await evaluate(`document.querySelector('#panel-sign-in button[type=submit]').click(), true`)
        await waitFor(`(location.pathname === "/dashboard" && document.body.innerText.includes("Hi,")) || !!document.querySelector('#panel-sign-in [role=alert]')`, `sign in ${email}`)
        const alert = await evaluate(`document.querySelector('#panel-sign-in [role=alert]')?.textContent ?? ""`)
        if (!alert) break
        if (alert !== AUTH_ERRORS.tooManyAttempts || attempt === 4) throw new Error(`sign in ${email} failed: ${alert}`)
        console.log(`(sign-in rate-limited for ${email}; waiting 20s, then retrying)`)
        await sleep(20000)
      }
      await sleep(1200)
    }

    await size(width, height)
    /** Calls fn with every DevTools event from this tab (for example Fetch.requestPaused). */
    const onEvent = (fn) => listeners.push((m) => { if (m.sessionId === sessionId && m.method) fn(m) })

    return { send, evaluate, waitFor, goto, reload, size, media, theme, key, shot, setValue, fill, signIn, posts, images, onEvent }
  }

  const close = () => { ws.close(); chrome.kill() }
  return { newTab, consoleErrors, close }
}
