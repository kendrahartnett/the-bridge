"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { signInAction } from "./actions"

const ROLES = [
  {
    value: "outreach",
    title: "I'm an outreach worker",
    body: "I meet people where they are and ask for food.",
  },
  {
    value: "donor",
    title: "I want to donate food",
    body: "I have food to give and can drop it off.",
  },
] as const

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm text-destructive">{messages[0]}</p>
}

export function SignInForm({ initialRole }: { initialRole?: "outreach" | "donor" }) {
  const [state, formAction, isPending] = useActionState(signInAction, null)
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const errors = state?.fieldErrors ?? {}
  const values = state?.values
  const selectedRole = values?.role || initialRole
  const isNew = mode === "sign-up"

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-6">
      <input type="hidden" name="mode" value={mode} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">How will you use The Bridge?</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className={cn(
              "flex min-h-tap cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4",
              "has-checked:border-primary has-checked:bg-secondary has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
            )}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              defaultChecked={selectedRole === r.value}
              required
              className="mt-1 size-5 accent-primary"
            />
            <span>
              <span className="block font-medium">{r.title}</span>
              <span className="block text-sm text-muted-foreground">{r.body}</span>
            </span>
          </label>
        ))}
        <FieldError messages={errors.role} />
      </fieldset>

      {isNew && (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="displayName">Your name</Label>
            <Input
              id="displayName"
              name="displayName"
              autoComplete="name"
              defaultValue={values?.displayName}
              required
            />
            <FieldError messages={errors.displayName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizationName">Organization</Label>
            <Input
              id="organizationName"
              name="organizationName"
              autoComplete="organization"
              placeholder="For example: a shelter, church, or restaurant"
              defaultValue={values?.organizationName}
              required
            />
            <FieldError messages={errors.organizationName} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={values?.email}
          required
        />
        <FieldError messages={errors.email} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isNew ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        <FieldError messages={errors.password} />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "One moment…" : isNew ? "Create my account" : "Sign in"}
      </Button>

      <Button
        type="button"
        variant="link"
        onClick={() => setMode(isNew ? "sign-in" : "sign-up")}
      >
        {isNew ? "I already have an account" : "I'm new here. Create an account"}
      </Button>
    </form>
  )
}
