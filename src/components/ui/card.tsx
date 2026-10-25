import * as React from "react"
import { cn } from "cn"

// Content cards are solid. Glass is reserved for the header, chat panel, dialogs, and menus.
const CARD_VARIANTS = {
  /** Solid surface, thin border, soft shadow. */
  default: "",
  /** A card that is itself clickable or holds the main action: lifts on hover. */
  interactive:
    "transition-[background-color,box-shadow,translate] duration-(--duration-base) ease-(--ease-brand) hover:-translate-y-0.5 hover:bg-surface-raised hover:shadow-md motion-reduce:hover:translate-y-0",
  /** A number with a label. */
  stat: "gap-1 px-5 py-5",
  /** Only for dialogs and menus. */
  glass: "glass border-border shadow-lg",
} as const

function Card({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: keyof typeof CARD_VARIANTS }) {
  return (
    <div
      data-slot="card"
      data-variant={variant}
      className={cn(
        "flex max-w-full min-w-0 flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
        CARD_VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-heading leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
