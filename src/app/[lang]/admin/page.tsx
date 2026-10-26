import { CircleCheck, ExternalLink } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { EmptyState } from "@/components/empty-state"
import { LoadingState } from "@/components/loading-state"
import { PageHeader } from "@/components/page-header"
import { SiteHeader } from "@/components/site-header"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/db"
import { DATE_LOCALE, type Lang } from "@/lib/i18n"
import { currentLang, getCopy } from "@/lib/i18n-server"
import { copyFor } from "@/lib/copy"
import { logAdminLookupFailure } from "@/lib/auth/failure-code"
import { lookUpUser } from "@/lib/current-user"
import { listOrganizationsForReview, type OrganizationForReview } from "@/lib/request-rules"
import { cn } from "@/lib/utils"

import { ReviewActions } from "./review-actions"

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getCopy()).META.admin, robots: { index: false, follow: false } }
}

const TABS = ["pending", "approved", "rejected"] as const
type Tab = (typeof TABS)[number]

const IRS_SEARCH = "https://apps.irs.gov/app/eos/"

const formatDate = (d: Date, lang: Lang) =>
  new Intl.DateTimeFormat(DATE_LOCALE[lang], { timeZone: "America/Chicago", dateStyle: "medium" }).format(d)

// proxy.ts already sends anyone who isn't an admin to the not-found page. This page checks
// again with the same rule, so the admin data never depends on the proxy alone.
export default async function AdminPage({ searchParams }: PageProps<"/[lang]/admin">) {
  const { ADMIN_COPY } = await getCopy()
  return (
    <>
      <SiteHeader signedIn />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Suspense fallback={<LoadingState>{ADMIN_COPY.loading}</LoadingState>}>
          <AdminContent searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  )
}

async function AdminContent({ searchParams }: { searchParams: PageProps<"/[lang]/admin">["searchParams"] }) {
  const { ADMIN_COPY } = await getCopy()
  const { user, sessionError } = await lookUpUser()
  if (sessionError) logAdminLookupFailure("session", sessionError)
  if (!user) notFound()
  const organizations = await listOrganizationsForReview(db, user.id)
  if (!organizations) notFound()

  const { tab: requested } = await searchParams
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : "pending"
  const byStatus = (s: Tab) => organizations.filter((o) => o.verificationStatus === s)
  const shown = byStatus(tab)

  return (
    <>
      <PageHeader
        back={{ href: "/dashboard", label: ADMIN_COPY.backToDashboard }}
        title={ADMIN_COPY.title}
        intro={ADMIN_COPY.intro}
      />

      {/* Each tab sizes to its label and count, so "Approved 12" never runs into its
          neighbor on a 320px screen. Below 640px the count sits under the label, so the
          longer Spanish labels still fit. */}
      <nav aria-label={ADMIN_COPY.tabsLabel} className="mt-8 flex border-b border-border-strong">
        {TABS.map((t) => {
          const current = t === tab
          return (
            <Link
              key={t}
              href={t === "pending" ? "/admin" : `/admin?tab=${t}`}
              aria-current={current ? "page" : undefined}
              className={cn(
                // The same tabs as sign-in: a 3px blue indicator on a firm baseline.
                "group -mb-px inline-flex min-h-tap flex-auto flex-col items-center justify-center gap-0.5 rounded-t-md border-b-[3px] px-1 py-1 text-sm font-semibold sm:flex-row sm:py-0 transition-colors duration-(--duration-base) outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none sm:gap-1.5 sm:px-2 sm:text-base",
                current
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {ADMIN_COPY.tabs[t]}
              {/* The count: tinted blue on the current tab. */}
              <span
                className={cn(
                  "rounded-full px-2 text-sm tabular-nums",
                  current ? "bg-primary/15 text-primary-text" : "bg-muted text-foreground"
                )}
              >
                {byStatus(t).length}
              </span>
            </Link>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <EmptyState className="mt-6">{ADMIN_COPY.empty[tab]}</EmptyState>
      ) : (
        <ul className="mt-6 grid gap-5 lg:grid-cols-2">
          {shown.map((o) => (
            <li key={o.id} className="min-w-0">
              <OrganizationCard organization={o} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

async function OrganizationCard({ organization: o }: { organization: OrganizationForReview }) {
  const lang = await currentLang()
  const { ADMIN_COPY } = copyFor(lang)
  const name = o.organizationName ?? o.email
  const status = o.verificationStatus
  return (
    <Card className="h-full gap-4">
      <CardHeader>
        <CardTitle className="font-heading text-h3 leading-snug [overflow-wrap:anywhere]">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-base">
        <dl className="grid gap-x-4 gap-y-2 [overflow-wrap:anywhere] sm:grid-cols-[auto_1fr]">
          {o.organizationWebsite && (
            <Field label={ADMIN_COPY.fields.website}>
              <ExternalLinkText href={o.organizationWebsite} url>
                {o.organizationWebsite}
              </ExternalLinkText>
            </Field>
          )}
          {o.organizationEin && <Field label={ADMIN_COPY.fields.ein}>{o.organizationEin}</Field>}
          {o.contactName && <Field label={ADMIN_COPY.fields.contact}>{o.contactName}</Field>}
          <Field label={ADMIN_COPY.fields.email}>
            <a
              href={`mailto:${o.email}`}
              className="inline-flex min-h-tap items-center font-medium break-all text-primary-text underline underline-offset-4 hover:no-underline"
            >
              {o.email}
            </a>
          </Field>
          <Field label={ADMIN_COPY.fields.applied}>{formatDate(o.createdAt, lang)}</Field>
          {status !== "pending" && o.reviewedAt && (
            <>
              <Field label={ADMIN_COPY.fields.reviewedBy}>{o.reviewerName ?? ADMIN_COPY.notRecorded}</Field>
              <Field label={ADMIN_COPY.fields.reviewed}>{formatDate(o.reviewedAt, lang)}</Field>
            </>
          )}
          {status === "rejected" && o.reviewNote && (
            <Field label={ADMIN_COPY.fields.note}>{o.reviewNote}</Field>
          )}
        </dl>

        {status === "pending" && (
          <section aria-label={ADMIN_COPY.verificationLabel} className="flex flex-col gap-2 rounded-lg bg-muted/60 p-3">
            <ExternalLinkText href={IRS_SEARCH}>{ADMIN_COPY.irsLink}</ExternalLinkText>
            <p className="text-sm font-medium">{ADMIN_COPY.checklistTitle}</p>
            <ul className="flex flex-col gap-1.5 text-sm">
              {ADMIN_COPY.checklist.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary-text" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </CardContent>
      {(status === "pending" || status === "approved") && (
        <CardFooter className="mt-auto border-t border-border pt-4">
          <ReviewActions organizationId={o.id} organizationName={name} status={status} />
        </CardFooter>
      )}
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-sm font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  )
}

/**
 * Opens in a new tab, without giving the other site access to this page. `url` lets a long
 * web address break anywhere; ordinary link text wraps between words.
 */
async function ExternalLinkText({ href, url, children }: { href: string; url?: boolean; children: React.ReactNode }) {
  const { ADMIN_COPY } = await getCopy()
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex min-h-tap items-center gap-1.5 self-start font-medium text-primary-text underline underline-offset-4 hover:no-underline",
        url && "break-all"
      )}
    >
      {children}
      <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
      <span className="sr-only"> {ADMIN_COPY.opensInNewTab}</span>
    </a>
  )
}
