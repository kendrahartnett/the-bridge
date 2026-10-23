"use client"

import { toast } from "sonner"

import { Button } from "@/components/ui/button"

// Placeholder: claiming is wired up on Day 2.
export function ClaimButton() {
  return (
    <Button
      className="w-full"
      onClick={() => toast("Claiming opens soon. Thanks for wanting to help!")}
    >
      Claim
    </Button>
  )
}
