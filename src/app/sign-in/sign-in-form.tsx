"use client"

import { CircleCheck, ClipboardPlus, HandHeart } from "lucide-react"
import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ROLE_CTAS } from "@/lib/copy"
import { cn } from "@/lib/utils"

import { signInAction } from "./actions"

// Same wording and icons as the landing page buttons.
const ROLES = [
  { value: "outreach", ...ROLE_CTAS.outreach, Icon: ClipboardPlus },
  { value: "donor", ...ROLE_CTAS.donor, Icon: HandHeart },
] as const

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="text-sm font-medium text-destructive">{messages[0]}</p>
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
        {ROLES.map(({ value, label, help, Icon }) => (
          // Styled like the landing buttons: glass with a blue border, and the selected
          // option filled blue with a soft glow. The radio stays in the DOM (visually
          // hidden) for keyboard and screen readers; a check mark shows the selection
          // so it never relies on color alone.
          <label
            key={value}
            className={cn(
              "group flex min-h-tap cursor-pointer items-center gap-3 rounded-lg border border-primary bg-background/50 p-4 text-primary-text backdrop-blur-md transition-colors motion-reduce:transition-none",
              "not-has-checked:hover:bg-primary/10",
              "has-checked:bg-primary has-checked:text-primary-foreground has-checked:shadow-[0_10px_30px_-8px_color-mix(in_srgb,var(--primary)_60%,transparent)]",
              "has-focus-visible:ring-[3px] has-focus-visible:ring-primary has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background"
            )}
          >
            <input
              type="radio"
              name="role"
              value={value}
              defaultChecked={selectedRole === value}
              required
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-5 shrink-0" />
            <span className="flex-1">
              <span className="block text-base font-semibold">{label}</span>
              <span className="block text-sm text-foreground group-has-checked:text-primary-foreground dark:text-muted-foreground dark:group-has-checked:text-primary-foreground">
                {help}
              </span>
            </span>
            <CircleCheck
              aria-hidden="true"
              className="size-5 shrink-0 opacity-0 group-has-checked:opacity-100"
            />
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
        <p role="alert" className="rounded-md border border-foreground bg-muted px-3 py-2 text-sm font-medium text-foreground">
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
