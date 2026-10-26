"use client"

import { useId, useState, useTransition } from "react"
import { toast } from "sonner"

import { Notice } from "@/components/notice"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useCopy } from "@/components/providers"

import { reviewOrganizationAction } from "./actions"

type Asking = null | "approve" | "reject" | "revoke"

const fill = (template: string, org: string) => template.replace("{org}", org)

/**
 * Approve / Reject for pending organizations, Revoke for approved ones. Each asks once
 * before it runs. The server checks again that the person is an admin, so this is only a
 * guard against mis-taps, not a security check.
 */
export function ReviewActions({
  organizationId,
  organizationName,
  status,
}: {
  organizationId: string
  organizationName: string
  status: "pending" | "approved"
}) {
  const { ADMIN_COPY } = useCopy()
  const [asking, setAsking] = useState<Asking>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const questionId = useId()
  const noteId = useId()

  function run(decision: "approved" | "rejected") {
    startTransition(async () => {
      const result = await reviewOrganizationAction({
        organizationId,
        decision,
        note: asking === "reject" && note.trim() ? note.trim() : undefined,
      })
      if (result.ok) {
        toast.success(result.message)
        return // the action revalidates /admin, which moves this card to its new tab
      }
      setError(result.error)
      toast.error(result.error)
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
        <div className="flex flex-col gap-2 sm:flex-row">
          {status === "pending" ? (
            <>
              <Button className="w-full sm:flex-1" onClick={() => setAsking("approve")}>
                {ADMIN_COPY.approve}
              </Button>
              <Button className="w-full sm:flex-1" variant="outline" onClick={() => setAsking("reject")}>
                {ADMIN_COPY.reject}
              </Button>
            </>
          ) : (
            <Button className="w-full sm:flex-1" variant="outline" onClick={() => setAsking("revoke")}>
              {ADMIN_COPY.revoke}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const question = {
    approve: ADMIN_COPY.confirmApprove,
    reject: ADMIN_COPY.confirmReject,
    revoke: ADMIN_COPY.confirmRevoke,
  }[asking]
  const confirm = { approve: ADMIN_COPY.yesApprove, reject: ADMIN_COPY.yesReject, revoke: ADMIN_COPY.yesRevoke }[asking]
  const decision = asking === "approve" ? "approved" : "rejected"

  // The confirmation: the question on a quiet panel, then the confirm and back-out buttons.
  // The same pattern as the request actions on dashboard cards.
  return (
    <div role="group" aria-labelledby={questionId} className="flex w-full flex-col gap-3 rounded-lg bg-muted/60 p-3">
      <p id={questionId} className="text-sm font-medium">
        {fill(question, organizationName)}
      </p>
      {asking === "reject" && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={noteId}>{ADMIN_COPY.noteLabel}</Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby={`${noteId}-count`}
          />
          <p id={`${noteId}-count`} className="text-sm text-muted-foreground">
            {ADMIN_COPY.noteCount.replace("{n}", String(note.length))}
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="w-full sm:flex-1"
          variant={asking === "approve" ? "default" : "destructive"}
          loading={isPending}
          onClick={() => run(decision)}
        >
          {isPending ? ADMIN_COPY.pending : confirm}
        </Button>
        <Button
          className="w-full sm:flex-1"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            setAsking(null)
            setError(null)
          }}
        >
          {ADMIN_COPY.notNow}
        </Button>
      </div>
    </div>
  )
}
