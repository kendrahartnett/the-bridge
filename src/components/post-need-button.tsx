import Link from "next/link"

import { Button } from "@/components/ui/button"
import { ROLE_CTAS } from "@/lib/copy"

/** The Post a Need button on the dashboard and the Needs Board. */
export function PostNeedButton() {
  return (
    <Button asChild size="lg">
      <Link href="/requests/new">{ROLE_CTAS.outreach.label}</Link>
    </Button>
  )
}
