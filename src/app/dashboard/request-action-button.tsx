"use client"

import { useRouter } from "next/navigation"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import {
  cancelRequestAction,
  claimRequestAction,
  confirmDeliveryAction,
  type RequestActionResult,
} from "./actions"

// Each action asks once before it runs. The server re-checks who you are and
// whether the request is still in the right state, so this is only a guard
// against mis-taps, not a security check.
const KINDS = {
  claim: {
    action: claimRequestAction,
    label: "Offer support",
    question: "Offer support for this request? You'll be able to coordinate with the person who posted it.",
    confirm: "Yes, offer support",
    variant: "default",
  },
  deliver: {
    action: confirmDeliveryAction,
    label: "Mark fulfilled",
    question: "Did the items arrive? This marks the request as fulfilled.",
    confirm: "Yes, mark fulfilled",
    variant: "default",
  },
  cancel: {
    action: cancelRequestAction,
    label: "Cancel",
    question: "Cancel this request? Organizations will no longer see it.",
    confirm: "Yes, cancel it",
    variant: "destructive",
  },
} as const

export function RequestActionButton({
  kind,
  requestId,
}: {
  kind: keyof typeof KINDS
  requestId: string
}) {
  const k = KINDS[kind]
  const router = useRouter()
  const questionId = useId()
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function run() {
    startTransition(async () => {
      const result: RequestActionResult = await k.action(requestId)
      if (result.ok) {
        toast.success(result.message)
        return // the action revalidates the dashboard, which re-renders this card
      }
      setError(result.error)
      setAsking(false)
      toast.error(result.error)
      router.refresh() // show the request's real state (e.g. someone else claimed it)
    })
  }

  if (!asking) {
    return (
      <div className="flex w-full flex-col gap-2">
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Button
          className="w-full"
          variant={kind === "cancel" ? "outline" : "default"}
          onClick={() => {
            setError(null)
            setAsking(true)
          }}
        >
          {k.label}
        </Button>
      </div>
    )
  }

  return (
    <div role="group" aria-labelledby={questionId} className="flex w-full flex-col gap-3">
      <p id={questionId} className="text-sm font-medium">
        {k.question}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto sm:flex-1" variant={k.variant} disabled={isPending} onClick={run}>
          {isPending ? "One moment…" : k.confirm}
        </Button>
        <Button
          className="w-full sm:w-auto sm:flex-1"
          variant="outline"
          disabled={isPending}
          onClick={() => setAsking(false)}
        >
          Not now
        </Button>
      </div>
    </div>
  )
}
