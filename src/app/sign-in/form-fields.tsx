"use client"

import { useState, type FormEvent } from "react"
import type { z } from "zod"

import { Notice } from "@/components/notice"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  if (!messages?.length) return null
  return (
    <p id={id} className="text-sm font-medium text-destructive">
      {messages[0]}
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
  ...props
}: React.ComponentProps<typeof Input> & {
  /** Keeps ids unique when several forms are on the page. */
  prefix: string
  name: string
  label: string
  errors?: string[]
  help?: string
}) {
  const id = `${prefix}-${name}`
  const describedBy = [help && `${id}-help`, errors?.length && `${id}-error`].filter(Boolean).join(" ")
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        aria-invalid={errors?.length ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={className}
        {...props}
      />
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
