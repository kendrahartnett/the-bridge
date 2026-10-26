import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getCopy } from "@/lib/i18n-server"

/** The Post a Need button on the dashboard and the Needs Board. */
export async function PostNeedButton() {
  const c = await getCopy()
  return (
    <Button asChild size="lg">
      <Link href="/requests/new">{c.ROLE_CTAS.outreach.label}</Link>
    </Button>
  )
}
