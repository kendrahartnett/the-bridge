"use client"

import { useRouter } from "next/navigation"
import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { useCopy } from "@/components/providers"

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
  claim: { action: claimRequestAction, variant: "default" },
  deliver: { action: confirmDeliveryAction, variant: "default" },
  cancel: { action: cancelRequestAction, variant: "destructive" },
} as const

export function RequestActionButton({
  kind,
  requestId,
}: {
  kind: keyof typeof KINDS
  requestId: string
}) {
  const { REQUEST_ACTIONS } = useCopy()
  const k = { ...KINDS[kind], ...REQUEST_ACTIONS[kind] }
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
          <Notice tone="error" alert className="p-3 text-sm">
            <p>{error}</p>
          </Notice>
        )}
        {/* Claim this need is the glowing button; Mark fulfilled and Cancel keep theirs. */}
        {kind === "claim" ? (
          <button
            type="button"
            className="glow-button glow-button-reflect w-full"
            onClick={() => {
              setError(null)
              setAsking(true)
            }}
          >
            {k.label}
          </button>
        ) : (
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
        )}
      </div>
    )
  }

  // The confirmation: the question on a quiet panel, then the confirm and back-out buttons.
  // The same pattern as the admin review actions.
  return (
    <div role="group" aria-labelledby={questionId} className="flex w-full flex-col gap-3 rounded-lg bg-muted/60 p-3">
      <p id={questionId} className="text-sm font-medium">
        {k.question}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="w-full sm:w-auto sm:flex-1" variant={k.variant} loading={isPending} onClick={run}>
          {isPending ? REQUEST_ACTIONS.pending : k.confirm}
        </Button>
        <Button
          className="w-full sm:w-auto sm:flex-1"
          variant="outline"
          disabled={isPending}
          onClick={() => setAsking(false)}
        >
          {REQUEST_ACTIONS.notNow}
        </Button>
      </div>
    </div>
  )
}
