"use client"

import { useState, type FormEvent } from "react"
import type { z } from "zod"

import { Notice } from "@/components/notice"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLang } from "@/components/providers"
import { translateMessage } from "@/lib/copy"

export type FieldErrors = Partial<Record<string, string[]>>

/**
 * Runs the same zod schema the server uses before the form submits. If it fails, the form
 * doesn't submit, the errors show under each field, and focus moves to the first problem.
 * The server action checks everything again either way.
 */
export function useClientValidation(schema: z.ZodType) {
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const result = schema.safeParse(Object.fromEntries(new FormData(form)))
    if (result.success) {
      setClientErrors(null)
      return
    }
    e.preventDefault()
    const errors: FieldErrors = {}
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? "")
      errors[key] ??= [issue.message]
    }
    setClientErrors(errors)
    const first = [...form.elements].find(
      (el): el is HTMLInputElement => el instanceof HTMLInputElement && el.name in errors
    )
    first?.focus()
  }

  return { clientErrors, onSubmit }
}

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  const lang = useLang()
  if (!messages?.length) return null
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {/* Validation messages come from the shared schemas in English. */}
      {translateMessage(messages[0], lang)}
    </p>
  )
}

/** A labelled text input with optional help text and its error, wired up for screen readers. */
export function TextField({
  prefix,
  name,
  label,
  errors,
  help,
  className,
  showPasswordToggle,
  ...props
}: React.ComponentProps<typeof Input> & {
  /** Keeps ids unique when several forms are on the page. */
  prefix: string
  name: string
  label: string
  errors?: string[]
  help?: string
  showPasswordToggle?: { show: string; hide: string }
}) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const id = `${prefix}-${name}`
  const describedBy = [help && `${id}-help`, errors?.length && `${id}-error`].filter(Boolean).join(" ")
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {showPasswordToggle ? (
        <div className="relative">
          <Input
            id={id}
            name={name}
            aria-invalid={errors?.length ? true : undefined}
            aria-describedby={describedBy || undefined}
            className={`${className ?? ""} pr-36`}
            {...props}
            type={passwordVisible ? "text" : "password"}
          />
          <button
            type="button"
            aria-controls={id}
            aria-label={passwordVisible ? showPasswordToggle.hide : showPasswordToggle.show}
            onClick={() => setPasswordVisible((visible) => !visible)}
            className="absolute inset-y-0 right-1 my-1 min-h-9 rounded px-2 text-sm font-medium text-primary-text hover:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            {passwordVisible ? showPasswordToggle.hide : showPasswordToggle.show}
          </button>
        </div>
      ) : (
        <Input
          id={id}
          name={name}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={className}
          {...props}
        />
      )}
      {help && (
        <p id={`${id}-help`} className="text-sm text-muted-foreground">
          {help}
        </p>
      )}
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  )
}

/** A required agreement checkbox. The whole row is the tap target. */
export function PledgeField({
  prefix,
  name,
  label,
  errors,
  defaultChecked,
}: {
  prefix: string
  name: string
  label: string
  errors?: string[]
  defaultChecked?: boolean
}) {
  const id = `${prefix}-${name}`
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className="flex min-h-tap cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-3 text-base"
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={defaultChecked}
          aria-invalid={errors?.length ? true : undefined}
          aria-describedby={errors?.length ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span>{label}</span>
      </label>
      <FieldError id={`${id}-error`} messages={errors} />
    </div>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <Notice tone="error" alert className="p-3 text-sm">
      <p>{message}</p>
    </Notice>
  )
}
