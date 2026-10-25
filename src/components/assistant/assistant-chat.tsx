"use client"

import { MessageCircle, Send, X } from "lucide-react"
import { useCallback, useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MAX_MESSAGE_CHARS, MAX_USER_MESSAGES } from "@/lib/assistant-config"
import { ASSISTANT_COPY } from "@/lib/copy"

const COPY = ASSISTANT_COPY.panel

type Message = { role: "user" | "assistant"; content: string }

// Same glass treatment as the landing page cards, more opaque so even the small counter
// text keeps 4.5:1 contrast over any page content behind the panel.
const GLASS =
  "border border-black/10 bg-background/90 backdrop-blur-xl dark:border-white/10 " +
  "shadow-[0_0_24px_color-mix(in_srgb,var(--primary-text)_10%,transparent),var(--soft-shadow-md)] " +
  "dark:shadow-[0_0_24px_color-mix(in_srgb,var(--primary-text)_20%,transparent),var(--soft-shadow-md)]"

// What the chat button must never sit on top of.
const INTERACTIVE = "a, button, input, select, textarea, label, [role=button], [role=combobox]"

const fill = (template: string, n: number) => template.replace("{n}", String(n))

/**
 * The assistant chat button and panel. The conversation lives only in this component's
 * state: nothing is stored, and it resets on page load. Below 640px the panel is a bottom
 * sheet; above, it sits in the bottom-right corner.
 */
export function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // How far the on-screen keyboard pushes into the layout viewport (iOS Safari keeps fixed
  // elements behind it), so the input stays visible above the keyboard.
  const [keyboardInset, setKeyboardInset] = useState(0)
  // True while a button, link, or field is underneath the chat button. It then fades out
  // (and ignores taps) so it never covers a CTA or a card action, and comes back once the
  // page scrolls clear. It still shows when focused from the keyboard.
  const [covering, setCovering] = useState(false)

  const launcherRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const ids = { panel: useId(), title: useId(), notice: useId(), error: useId(), count: useId() }

  const questionsAsked = messages.filter((m) => m.role === "user").length
  const atLimit = questionsAsked >= MAX_USER_MESSAGES
  const charsLeft = MAX_MESSAGE_CHARS - draft.length
  const notice = error ?? (atLimit ? ASSISTANT_COPY.errors.sessionLimit : null)

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
    const text = question.trim()
    if (pending) return
    if (!text) return setError(ASSISTANT_COPY.errors.empty)
    if (text.length > MAX_MESSAGE_CHARS) return setError(ASSISTANT_COPY.errors.tooLong)
    if (atLimit) return setError(ASSISTANT_COPY.errors.sessionLimit)

    const history: Message[] = [...messages, { role: "user", content: text }]
    setMessages(history)
    setDraft("")
    setError(null)
    setPending(true)
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })
      const data: { reply?: string; error?: string } = await res.json().catch(() => ({}))
      if (!res.ok || !data.reply) throw new Error(data.error ?? ASSISTANT_COPY.errors.invalid)
      setMessages([...history, { role: "assistant", content: data.reply }])
    } catch (err) {
      // Roll the question back so it can be retried and the turns still alternate.
      setMessages(messages)
      setDraft(text)
      setError(err instanceof TypeError ? COPY.networkError : (err as Error).message)
    } finally {
      setPending(false)
      inputRef.current?.focus()
    }
  }

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        data-assistant-launcher
        data-covering={covering || undefined}
        aria-label={COPY.openLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_color-mix(in_srgb,var(--primary)_60%,transparent)] transition-[opacity,background-color] duration-150 outline-none hover:bg-primary/90 data-covering:pointer-events-none data-covering:opacity-0 data-covering:focus-visible:pointer-events-auto data-covering:focus-visible:opacity-100 focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <MessageCircle aria-hidden="true" className="size-6" />
      </button>
    )
  }

  return (
    <>
      {/* Mobile only: dims the page behind the sheet; tapping it closes the panel. */}
      <div
        aria-hidden="true"
        onClick={close}
        className="fixed inset-0 z-40 bg-black/40 animate-in fade-in sm:hidden motion-reduce:animate-none"
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
        className={`fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-xl text-foreground ${GLASS} animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-h-[min(40rem,calc(100dvh-2rem))] sm:w-[24rem] sm:rounded-xl`}
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
          {messages.length === 0 && (
            <div className="flex flex-col gap-2">
              {COPY.starters.map((starter) => (
                <Button
                  key={starter}
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => ask(starter)}
                  className="h-auto min-h-tap justify-start rounded-lg border-primary/40 bg-background/60 py-2 text-left whitespace-normal text-primary-text hover:bg-primary/10 hover:text-primary-text"
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
                className={
                  m.role === "user"
                    ? "ml-8 self-end rounded-lg bg-primary px-3 py-2 text-base text-primary-foreground"
                    : "mr-4 self-start rounded-lg border border-border bg-surface px-3 py-2 text-base"
                }
              >
                <span className="sr-only">{m.role === "user" ? COPY.you : COPY.assistant}: </span>
                <span className="whitespace-pre-wrap">{m.content}</span>
              </li>
            ))}
          </ol>
          {pending && (
            <p role="status" className="self-start text-sm text-muted-foreground">
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
          {notice && (
            <p id={ids.error} role="alert" className="text-sm font-medium text-foreground">
              {notice}
            </p>
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
              disabled={atLimit}
              autoComplete="off"
              enterKeyHint="send"
              aria-invalid={charsLeft < 0 || undefined}
              aria-describedby={`${ids.count}${notice ? ` ${ids.error}` : ""}`}
              className="bg-surface text-base md:text-base"
            />
            <Button type="submit" size="icon" aria-label={COPY.send} disabled={pending || atLimit}>
              <Send aria-hidden="true" className="size-5" />
            </Button>
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
