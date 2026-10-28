"use client"

import { ClipboardPlus, HandHeart } from "lucide-react"
import { useActionState, useRef, useState, type KeyboardEvent } from "react"

import { Notice } from "@/components/notice"
import { useCopy } from "@/components/providers"
import { cn } from "@/lib/utils"
import { organizationSignUpSchema, posterSignUpSchema } from "@/lib/validation"

import { signUpAction } from "./actions"
import { FormError, PledgeField, TextField, useClientValidation } from "./form-fields"

export type AccountType = "poster" | "organization"

const TYPES = [
  // Label and help: AUTH_COPY.accountTypes[value], in the page's language.
  { value: "poster", Icon: ClipboardPlus },
  { value: "organization", Icon: HandHeart },
] as const

/** Choose the kind of account, then fill in the form for it. */
export function CreateAccountForm({ initialType = "poster" }: { initialType?: AccountType }) {
  const [type, setType] = useState<AccountType>(initialType)
  return (
    <div className="flex flex-col gap-6">
      <AccountTypeSwitch value={type} onChange={setType} />
      {type === "poster" ? <PosterForm /> : <OrganizationForm />}
    </div>
  )
}

/**
 * A segmented control that behaves like a radio group: Tab reaches the selected option,
 * arrow keys move and select, and each option is at least 44px tall.
 */
function AccountTypeSwitch({ value, onChange }: { value: AccountType; onChange: (v: AccountType) => void }) {
  const { AUTH_COPY } = useCopy()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }
    let next: number | null = null
    if (e.key in keys) next = (index + keys[e.key] + TYPES.length) % TYPES.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = TYPES.length - 1
    if (next === null) return
    e.preventDefault()
    onChange(TYPES[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <p id="account-type-label" className="font-medium">
        {AUTH_COPY.accountTypeLabel}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="account-type-label"
        className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2"
      >
        {TYPES.map(({ value: v, Icon }, i) => {
          const { label, help } = AUTH_COPY.accountTypes[v]
          const checked = v === value
          return (
            <button
              key={v}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(v)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                // Selectable cards: the chosen one gets a blue outline and tint, the other a
                // visible border (3:1) that firms up on hover.
                "flex min-h-tap items-start gap-2 rounded-xl border px-3 py-3 text-left text-foreground transition-colors duration-(--duration-base) outline-none focus-visible:ring-[3px] focus-visible:ring-ring motion-reduce:transition-none",
                checked
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border-strong bg-card hover:border-primary/60 hover:bg-muted/40"
              )}
            >
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary-text" />
              <span>
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted-foreground">
                  {help}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PosterForm() {
  const { AUTH_COPY } = useCopy()
  const [state, formAction, isPending] = useActionState(signUpAction, null)
  const { clientErrors, onSubmit } = useClientValidation(posterSignUpSchema)
  const errors = clientErrors ?? state?.fieldErrors ?? {}
  const v = state?.values
  const p = "poster"

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="accountType" value="poster" />
      <TextField prefix={p} name="displayName" label={AUTH_COPY.fields.yourName} autoComplete="name" defaultValue={v?.displayName} errors={errors.displayName} />
      <TextField prefix={p} name="email" label={AUTH_COPY.fields.email} type="email" autoComplete="email" defaultValue={v?.email} errors={errors.email} />
      <TextField prefix={p} name="password" label={AUTH_COPY.fields.password} type="password" autoComplete="new-password" help={AUTH_COPY.passwordHelp} errors={errors.password} showPasswordToggle={{ show: AUTH_COPY.showPassword, hide: AUTH_COPY.hidePassword }} />
      <TextField prefix={p} name="confirmPassword" label={AUTH_COPY.fields.confirmPassword} type="password" autoComplete="new-password" errors={errors.confirmPassword} showPasswordToggle={{ show: AUTH_COPY.showPassword, hide: AUTH_COPY.hidePassword }} />
      <TextField prefix={p} name="organizationName" label={AUTH_COPY.fields.team} autoComplete="organization" defaultValue={v?.organizationName} errors={errors.organizationName} />
      <PledgeField prefix={p} name="pledge" label={AUTH_COPY.posterPledge} defaultChecked={v?.pledge === "on"} errors={errors.pledge} />
      <FormError message={state?.error} />
      <button type="submit" className="glow-button" disabled={isPending} aria-busy={isPending}>
        {isPending ? AUTH_COPY.pending : AUTH_COPY.submitCreate}
      </button>
    </form>
  )
}

function OrganizationForm() {
  const { AUTH_COPY } = useCopy()
  const [state, formAction, isPending] = useActionState(signUpAction, null)
  const { clientErrors, onSubmit } = useClientValidation(organizationSignUpSchema)
  const errors = clientErrors ?? state?.fieldErrors ?? {}
  const v = state?.values
  const p = "organization"

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <input type="hidden" name="accountType" value="organization" />
      <Notice className="p-3 text-sm">
        <p>{AUTH_COPY.organizationReview}</p>
      </Notice>
      <TextField prefix={p} name="organizationName" label={AUTH_COPY.fields.organizationName} autoComplete="organization" defaultValue={v?.organizationName} errors={errors.organizationName} />
      <TextField prefix={p} name="website" label={AUTH_COPY.fields.website} type="url" inputMode="url" autoComplete="url" placeholder={AUTH_COPY.fields.websitePlaceholder} defaultValue={v?.website} errors={errors.website} />
      <TextField prefix={p} name="ein" label={AUTH_COPY.fields.ein} inputMode="numeric" placeholder={AUTH_COPY.fields.einPlaceholder} help={AUTH_COPY.fields.einHelp} defaultValue={v?.ein} errors={errors.ein} />
      <TextField prefix={p} name="contactName" label={AUTH_COPY.fields.contactName} autoComplete="name" defaultValue={v?.contactName} errors={errors.contactName} />
      <TextField prefix={p} name="email" label={AUTH_COPY.fields.email} type="email" autoComplete="email" defaultValue={v?.email} errors={errors.email} />
      <TextField prefix={p} name="password" label={AUTH_COPY.fields.password} type="password" autoComplete="new-password" help={AUTH_COPY.passwordHelp} errors={errors.password} showPasswordToggle={{ show: AUTH_COPY.showPassword, hide: AUTH_COPY.hidePassword }} />
      <TextField prefix={p} name="confirmPassword" label={AUTH_COPY.fields.confirmPassword} type="password" autoComplete="new-password" errors={errors.confirmPassword} showPasswordToggle={{ show: AUTH_COPY.showPassword, hide: AUTH_COPY.hidePassword }} />
      <PledgeField prefix={p} name="pledge" label={AUTH_COPY.organizationPledge} defaultChecked={v?.pledge === "on"} errors={errors.pledge} />
      <FormError message={state?.error} />
      <button type="submit" className="glow-button" disabled={isPending} aria-busy={isPending}>
        {isPending ? AUTH_COPY.pending : AUTH_COPY.submitCreate}
      </button>
    </form>
  )
}
