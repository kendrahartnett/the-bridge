import { Clock } from "lucide-react"

import { Notice } from "@/components/notice"
import type { User } from "@/db/schema"
import { DASHBOARD_COPY, VERIFICATION_COPY } from "@/lib/copy"

/**
 * Shown to organizations that aren't approved (yet), on the dashboard and the Needs Board.
 * Both versions end with ADMIN_CONTACT_EMAIL when it's set.
 */
export function VerificationBanner({ status }: { status: User["verificationStatus"] }) {
  const rejected = status === "rejected"
  const adminEmail = process.env.ADMIN_CONTACT_EMAIL
  const email = adminEmail && (
    <a
      href={`mailto:${adminEmail}`}
      className="font-semibold break-all underline underline-offset-4 hover:no-underline"
    >
      {adminEmail}
    </a>
  )
  const withEmail = (text: string) => {
    const [before, after] = text.split("{email}")
    return (
      <>
        {before}
        {email}
        {after}
      </>
    )
  }

  let message: React.ReactNode
  if (rejected) {
    message = email ? withEmail(VERIFICATION_COPY.rejectedBanner) : VERIFICATION_COPY.rejectedBannerNoEmail
  } else {
    message = email ? (
      <>
        {VERIFICATION_COPY.pendingBanner} {withEmail(VERIFICATION_COPY.pendingQuestions)}
      </>
    ) : (
      VERIFICATION_COPY.pendingBanner
    )
  }
  return (
    <Notice
      tone={rejected ? "error" : "info"}
      icon={rejected ? undefined : Clock}
      label={DASHBOARD_COPY.organization.accountStatusLabel}
      className="mt-6"
    >
      <p>{message}</p>
    </Notice>
  )
}
