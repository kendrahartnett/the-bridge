"use client"

import { MessageCircle, X } from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import { ArchLoader } from "@/components/brand/arch-loader"
import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MAX_MESSAGE_CHARS, MAX_USER_MESSAGES } from "@/lib/assistant-config"
import { isCrisisMessage } from "@/lib/chat-crisis"
import { useCopy } from "@/components/providers"

type Message = { role: "user" | "assistant"; content: string }

// The shared glass surface (globals.css): 90% opaque, so even the small counter text keeps
// 4.5:1 contrast over any page content behind the panel.
const GLASS = "glass border border-border shadow-lg"

// What the chat button must never sit on top of.
const INTERACTIVE = "a, button, input, select, textarea, label, [role=button], [role=combobox]"

const fill = (template: string, n: number) => template.replace("{n}", String(n))

// Remembers that the phone hint ("Ask a question") was shown, so it appears on the first
// visit only.
const HINT_SEEN_KEY = "bridge-chat-hint-seen"
// The tooltip waits this long after hover or keyboard focus, so passing over the button
// doesn't flash it.
const TOOLTIP_DELAY_MS = 300
const HINT_DURATION_MS = 5000
const CHAT_STORAGE_KEY = "bridge-chat-transcript-v1"

function clearStoredTranscript() {
  try {
    sessionStorage.removeItem(CHAT_STORAGE_KEY)
  } catch {
    try { sessionStorage.setItem(CHAT_STORAGE_KEY, "[]") } catch { /* Browser storage may be unavailable. */ }
  }
}

/**
 * The assistant chat button and panel. Completed messages are kept in tab sessionStorage
 * for refresh recovery; server session metadata contains no transcript. Below 640px the
 * panel is a bottom sheet; above, it sits in the bottom-right corner.
 */
export function AssistantChat() {
  const { ASSISTANT_COPY } = useCopy()
  const COPY = ASSISTANT_COPY.panel
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [canStartNew, setCanStartNew] = useState(false)
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  // How far the on-screen keyboard pushes into the layout viewport (iOS Safari keeps fixed
  // elements behind it), so the input stays visible above the keyboard.
  const [keyboardInset, setKeyboardInset] = useState(0)
  // True while a button, link, or field is underneath the chat button. It then fades out
  // (and ignores taps) so it never covers a CTA or a card action, and comes back once the
  // page scrolls clear. It still shows when focused from the keyboard.
  const [covering, setCovering] = useState(false)
  // The launcher's tooltip (hover or keyboard focus, after a short delay) and the one-time
  // phone hint beside it.
  const [tooltip, setTooltip] = useState(false)
  const [hint, setHint] = useState(false)
  const tooltipTimer = useRef<number | undefined>(undefined)

  const launcherRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const ids = { panel: useId(), title: useId(), notice: useId(), error: useId(), count: useId() }

  const questionsAsked = messages.filter((m) => m.role === "user").length
  const atLimit = questionsAsked >= MAX_USER_MESSAGES
  const charsLeft = MAX_MESSAGE_CHARS - draft.length
  const notice = error ?? (atLimit ? ASSISTANT_COPY.errors.sessionLimit : null)

  // Keep the current tab's transcript across a refresh so it can be checked against the
  // server's metadata digest. It is never written to the server database.
  useEffect(() => {
    const restore = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem(CHAT_STORAGE_KEY)
        if (saved) {
          const value: unknown = JSON.parse(saved)
          if (Array.isArray(value) && value.length <= 20 && value.every((m) =>
            m && typeof m === "object" && (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string" && m.content.length <= (m.role === "user" ? MAX_MESSAGE_CHARS : 4000)
          )) setMessages(value as Message[])
        }
      } catch {
        // If browser storage is unavailable or malformed, the server will require a fresh chat.
      } finally {
        setRestored(true)
      }
    }, 0)
    return () => window.clearTimeout(restore)
  }, [])

  useEffect(() => {
    if (!restored || pending) return
    try {
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    } catch {
      // Storage can be disabled; in that case a refresh may require a new conversation.
    }
  }, [messages, pending, restored])

  const showTooltip = useCallback(() => {
    window.clearTimeout(tooltipTimer.current)
    tooltipTimer.current = window.setTimeout(() => setTooltip(true), TOOLTIP_DELAY_MS)
  }, [])
  const hideTooltip = useCallback(() => {
    window.clearTimeout(tooltipTimer.current)
    setTooltip(false)
  }, [])

  // Escape hides the tooltip without moving focus.
  useEffect(() => {
    if (!tooltip) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideTooltip()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [tooltip, hideTooltip])
  useEffect(() => () => window.clearTimeout(tooltipTimer.current), [])

  // Phones, first visit only: a small "Ask a question" pill beside the button. It fades
  // after 5 seconds or at the first tap anywhere. Storage can be unavailable (private
  // browsing, blocked site data); then the hint may show again on a later visit.
  useEffect(() => {
    if (!window.matchMedia("(max-width: 639px)").matches) return
    let seen = false
    try {
      seen = window.localStorage.getItem(HINT_SEEN_KEY) === "1"
      if (!seen) window.localStorage.setItem(HINT_SEEN_KEY, "1")
    } catch {
      // Storage unavailable: show the hint this time anyway.
    }
    if (seen) return
    const dismiss = () => setHint(false)
    const show = window.setTimeout(() => setHint(true), 0)
    const hide = window.setTimeout(dismiss, HINT_DURATION_MS)
    document.addEventListener("pointerdown", dismiss, { once: true })
    return () => {
      window.clearTimeout(show)
      window.clearTimeout(hide)
      document.removeEventListener("pointerdown", dismiss)
    }
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    // Wait for the launcher to render again before moving focus back to it.
    requestAnimationFrame(() => launcherRef.current?.focus())
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close()
      // Keep Tab inside the panel while it is open; Escape or the close button leaves it.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>("button:enabled, input:enabled")
      if (e.key !== "Tab" || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, close])

  useEffect(() => {
    const vv = window.visualViewport
    if (!open || !vv) return
    const update = () => setKeyboardInset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    update()
    vv.addEventListener("resize", update)
    vv.addEventListener("scroll", update)
    return () => {
      vv.removeEventListener("resize", update)
      vv.removeEventListener("scroll", update)
    }
  }, [open])

  useEffect(() => {
    if (open) return
    let frame = 0
    const measure = () => {
      frame = 0
      const button = launcherRef.current
      if (!button) return
      const r = button.getBoundingClientRect()
      // Compare the button's box with every control's box, so even a sliver of overlap
      // counts. (Hidden form helpers are 1px and aria-hidden; they don't count.)
      const hit = [...document.querySelectorAll(INTERACTIVE)].some((el) => {
        if (button.contains(el) || el.closest("[aria-hidden=true]")) return false
        const b = el.getBoundingClientRect()
        return (
          b.width > 1 &&
          b.height > 1 &&
          b.left < r.right &&
          b.right > r.left &&
          b.top < r.bottom &&
          b.bottom > r.top &&
          el.checkVisibility()
        )
      })
      setCovering(hit)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    schedule()
    const resize = new ResizeObserver(schedule)
    resize.observe(document.body)
    window.addEventListener("scroll", schedule, { passive: true, capture: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      window.removeEventListener("scroll", schedule, { capture: true })
      window.removeEventListener("resize", schedule)
    }
  }, [open])

  // Keep the newest message in view. A new reply is shown from its first line, so long
  // answers are read from the top.
  useEffect(() => {
    const log = logRef.current
    if (!log) return
    const last = log.querySelector("li:last-child")
    if (last && messages.at(-1)?.role === "assistant") {
      log.scrollTop += last.getBoundingClientRect().top - log.getBoundingClientRect().top - 12
    } else {
      log.scrollTo({ top: log.scrollHeight })
    }
  }, [messages, pending])

  async function ask(question: string) {
    if (!restored) return
    const text = question.trim()
    if (pending) return
    if (!text) return setError(ASSISTANT_COPY.errors.empty)
    if (text.length > MAX_MESSAGE_CHARS) return setError(ASSISTANT_COPY.errors.tooLong)
    if (atLimit && !isCrisisMessage(text)) return setError(ASSISTANT_COPY.errors.sessionLimit)

    const history: Message[] = [...messages, { role: "user", content: text }]
    setMessages(history)
    setDraft("")
    setError(null)
    setSafetyNotice(null)
    setPending(true)
    let resetClientConversation = false
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages, question: text, expectedTurn: questionsAsked }),
      })
      const data: { reply?: string; error?: string; code?: string; source?: "assistant" | "fallback" | "safety"; resetConversation?: boolean } = await res.json().catch(() => ({}))
      if (res.ok && data.source === "safety" && data.reply) {
        clearStoredTranscript()
        setMessages([])
        setDraft("")
        setCanStartNew(false)
        setSafetyNotice(data.reply)
        return
      }
      if (!res.ok || !data.reply) {
        if (data.resetConversation) {
          resetClientConversation = true
          clearStoredTranscript()
          setMessages([])
          setCanStartNew(false)
        }
        if (["expired", "session_limit", "busy"].includes(data.code ?? "") || data.code === "invalid" && res.status === 409) setCanStartNew(true)
        throw new Error(data.error ?? ASSISTANT_COPY.errors.invalid)
      }
      const complete = [...history, { role: "assistant" as const, content: data.reply }]
      setMessages(complete)
      setCanStartNew(false)
    } catch (err) {
      // Roll the question back so it can be retried and the turns still alternate.
      setMessages(resetClientConversation ? [] : messages)
      setDraft(text)
      if (err instanceof TypeError) {
        setCanStartNew(true)
        setError(ASSISTANT_COPY.errors.staleConversation)
      } else {
        setError((err as Error).message)
      }
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  async function startNewConversation() {
    if (pending) return
    try {
      const response = await fetch("/api/chat/session", { method: "POST" })
      if (!response.ok) throw new Error()
    } catch {
      setError(COPY.networkError)
      return
    }
    clearStoredTranscript()
    setMessages([])
    setError(null)
    setSafetyNotice(null)
    setCanStartNew(false)
    inputRef.current?.focus()
  }

  if (!open) {
    return (
      // The button sits in the bottom-right corner; the tooltip and the phone hint open to
      // its left, so they never run off the screen. Both repeat the button's name, so they
      // are hidden from screen readers (no double announcement).
      <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40">
        <button
          ref={launcherRef}
          type="button"
          data-assistant-launcher
          data-covering={covering || undefined}
          aria-label={COPY.openLabel}
          aria-haspopup="dialog"
          onClick={() => {
            hideTooltip()
            setHint(false)
            setOpen(true)
          }}
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") showTooltip()
          }}
          onPointerLeave={hideTooltip}
          onFocus={showTooltip}
          onBlur={hideTooltip}
          className="inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground glow-primary transition-[opacity,background-color] duration-150 outline-none hover:bg-primary/90 data-covering:pointer-events-none data-covering:opacity-0 data-covering:focus-visible:pointer-events-auto data-covering:focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <MessageCircle aria-hidden="true" className="size-6" />
        </button>
        <LauncherBubble kind="tooltip" shown={tooltip}>
          {COPY.openLabel}
        </LauncherBubble>
        <LauncherBubble kind="hint" shown={hint && !tooltip && !covering}>
          {COPY.phoneHint}
        </LauncherBubble>
      </div>
    )
  }

  return (
    <>
      {/* Mobile only: dims the page behind the sheet; tapping it closes the panel. */}
      <div
        aria-hidden="true"
        onClick={close}
        className="fixed inset-0 z-40 bg-scrim animate-in fade-in sm:hidden motion-reduce:animate-none"
      />
      <section
        ref={panelRef}
        id={ids.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        aria-describedby={ids.notice}
        data-assistant-panel
        style={{ bottom: keyboardInset || undefined }}
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[0.5rem] text-foreground ${GLASS} animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-h-[min(40rem,calc(100dvh-2rem))] sm:w-[24rem] sm:rounded-[0.5rem]`}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border py-1 pr-1 pl-4">
          <h2 id={ids.title} className="font-heading text-base font-bold">
            {COPY.title}
          </h2>
          <Button type="button" variant="ghost" size="icon" aria-label={COPY.closeLabel} onClick={close}>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </header>

        <p id={ids.notice} className="border-b border-border bg-muted/60 px-4 py-2 text-sm text-foreground">
          {COPY.notice}
        </p>

        <div ref={logRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
          {safetyNotice && (
            <p role="alert" className="rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm text-foreground">
              {safetyNotice}
            </p>
          )}
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              {COPY.starters.map((starter) => (
                <Button
                  key={starter}
                  type="button"
                  variant="outline"
                  disabled={pending || !restored}
                  onClick={() => ask(starter)}
                  className="h-auto min-h-tap justify-start rounded-xl border-primary/40 bg-surface-raised py-2 text-left whitespace-normal text-primary-text hover:bg-primary/10 hover:text-primary-text"
                >
                  {starter}
                </Button>
              ))}
            </div>
          )}
          {/* Screen readers hear each new reply as it arrives. */}
          <ol aria-live="polite" className="flex flex-col gap-3">
            {messages.map((m, i) => (
              <li
                key={i}
                // Rounded bubbles with a tighter "tail" corner on the sender's side (a corner
                // radius only, so it never changes the layout). Replies on the raised surface.
                className={
                  m.role === "user"
                    ? "ml-8 self-end rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-base text-primary-foreground"
                    : "mr-4 self-start rounded-2xl rounded-bl-sm border border-border bg-surface-raised px-3.5 py-2.5 text-base text-foreground"
                }
              >
                <span className="sr-only">{m.role === "user" ? COPY.you : COPY.assistant}: </span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </li>
            ))}
          </ol>
          {/* Announced once per reply (the text doesn't change while it waits); the arch is
              decorative and never announced. */}
          {pending && (
            <p role="status" className="flex items-center gap-2.5 self-start text-sm text-muted-foreground">
              <ArchLoader />
              {COPY.thinking}
            </p>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask(draft)
          }}
          className="flex flex-col gap-1 border-t border-border px-4 pt-3 pb-2"
        >
          {/* role="alert" is on the Notice only, so the error is announced once. */}
          {notice && (
            <Notice tone="error" alert className="mb-1 p-2 text-sm">
              <p id={ids.error}>{notice}</p>
            </Notice>
          )}
          {(atLimit || canStartNew) && (
            <Button type="button" variant="outline" disabled={pending} onClick={startNewConversation} className="mb-1 min-h-tap">
              {COPY.newConversation}
            </Button>
          )}
          <label htmlFor={`${ids.panel}-input`} className="sr-only">
            {COPY.inputLabel}
          </label>
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              id={`${ids.panel}-input`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={COPY.placeholder}
              disabled={!restored}
              autoComplete="off"
              enterKeyHint="send"
              aria-invalid={charsLeft < 0 || undefined}
              aria-describedby={`${ids.count}${notice ? ` ${ids.error}` : ""}`}
              className="bg-surface"
            />
            {/* Send: design from Uiverse.io by EcheverriaJesus (the label and a paper-plane icon;
                on hover a lighter blue, a wider gap, and a nudge to the right). Near-black text
                for contrast on both blues (5.3:1, 7.9:1 on hover); 44px tall; a focus ring;
                dimmed while sending; no movement with reduced motion. */}
            <button
              type="submit"
              disabled={pending || !restored || (atLimit && !isCrisisMessage(draft))}
              className="flex min-h-tap shrink-0 cursor-pointer items-center gap-1 rounded-md bg-blue-500 px-4 py-2 font-semibold tracking-widest text-gray-950 outline-none transition-[translate,gap,background-color] duration-300 hover:translate-x-3 hover:gap-2 hover:bg-blue-400 focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:gap-1 disabled:hover:bg-blue-500 motion-reduce:duration-0 motion-reduce:hover:translate-x-0"
            >
              {COPY.send}
              <svg aria-hidden="true" className="size-5" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <p id={ids.count} className="flex justify-between gap-2 text-xs text-muted-foreground">
            <span>{fill(COPY.questionsLeft, MAX_USER_MESSAGES - questionsAsked)}</span>
            <span className={charsLeft < 0 ? "font-semibold text-foreground" : undefined}>
              {fill(COPY.charactersLeft, charsLeft)}
            </span>
          </p>
        </form>

        <p className="border-t border-border px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] text-center text-sm font-semibold">
          {COPY.crisis}
        </p>
      </section>
    </>
  )
}

/**
 * A small bubble to the left of the chat button, with a pointer toward it: the tooltip, or
 * (as a pill) the one-time phone hint. Decorative: the button carries the same name.
 * Reduced motion: it just shows and hides, without the fade.
 */
function LauncherBubble({ kind, shown, children }: { kind: "tooltip" | "hint"; shown: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      data-assistant-tooltip={kind === "tooltip" || undefined}
      data-assistant-hint={kind === "hint" || undefined}
      data-shown={shown || undefined}
      className={`pointer-events-none invisible absolute top-1/2 right-full mr-3 -translate-y-1/2 border border-border bg-surface-raised px-3 py-1.5 text-sm font-medium whitespace-nowrap text-foreground opacity-0 shadow-md transition-[opacity,visibility] duration-(--duration-base) motion-reduce:transition-none data-shown:visible data-shown:opacity-100 ${kind === "hint" ? "rounded-full" : "rounded-lg"}`}
    >
      {children}
      <span className="absolute top-1/2 -right-[5px] size-2.5 -translate-y-1/2 rotate-45 border-t border-r border-border bg-surface-raised" />
    </span>
  )
}
