"use client"

import { useActionState } from "react"

import { useCopy } from "@/components/providers"
import { signInSchema } from "@/lib/validation"

import { signInAction } from "./actions"
import { FormError, TextField, useClientValidation } from "./form-fields"

/** Email and password only. The account's role comes from the database, not this form. */
export function SignInForm() {
  const { AUTH_COPY } = useCopy()
  const [state, formAction, isPending] = useActionState(signInAction, null)
  const { clientErrors, onSubmit } = useClientValidation(signInSchema)
  const errors = clientErrors ?? state?.fieldErrors ?? {}

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <TextField
        prefix="sign-in"
        name="email"
        label={AUTH_COPY.fields.email}
        type="email"
        autoComplete="email"
        defaultValue={state?.values?.email}
        errors={errors.email}
      />
      <TextField
        prefix="sign-in"
        name="password"
        label={AUTH_COPY.fields.password}
        type="password"
        autoComplete="current-password"
        errors={errors.password}
      />
      <FormError message={state?.error} />
      <button type="submit" className="glow-button" disabled={isPending} aria-busy={isPending}>
        {isPending ? AUTH_COPY.pending : AUTH_COPY.submitSignIn}
      </button>
    </form>
  )
}
