import Link from "next/link"

import { getCopy } from "@/lib/i18n-server"

/** The Post a Need button on the dashboard and the Needs Board (the glowing button). */
export async function PostNeedButton() {
  const c = await getCopy()
  return (
    <Link href="/requests/new" className="glow-button">
      {c.ROLE_CTAS.outreach.label}
    </Link>
  )
}
