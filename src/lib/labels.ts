// Display labels for database values. The stored values never change; only what people see.

export const ROLE_LABELS = {
  outreach: "Outreach worker or community member",
  donor: "Organization",
} as const

export const STATUS_LABELS = {
  open: "Open",
  claimed: "In Progress",
  delivered: "Fulfilled",
  cancelled: "Cancelled",
} as const

export const CATEGORIES = ["food", "clothing", "hygiene", "other"] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  clothing: "Clothing",
  hygiene: "Hygiene supplies",
  other: "Other",
}
