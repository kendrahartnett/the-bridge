import { z } from "zod"

export const PRIVACY_CATEGORIES = [
  "exact_address",
  "unit_identifier",
  "precise_location",
  "vulnerable_person_identification",
] as const

export type PrivacyCategory = (typeof PRIVACY_CATEGORIES)[number]

const Category = z.enum(PRIVACY_CATEGORIES)
const Classification = z.strictObject({
  approved: z.boolean(),
  riskLevel: z.enum(["low", "medium", "high"]),
  categories: z.array(Category).max(4),
  reason: z.string().max(500),
  suggestedRewrite: z.string().max(300).nullable(),
})

export type PrivacyClassification = z.infer<typeof Classification>

export function parseClassification(value: unknown): PrivacyClassification | null {
  const parsed = Classification.safeParse(value)
  if (!parsed.success) return null
  const result = parsed.data
  if (result.approved !== (result.riskLevel === "low" && result.categories.length === 0)) return null
  if (result.riskLevel === "high" && result.categories.length === 0) return null
  return result
}

// Only unambiguous property-specific patterns are deterministic. Ordinary quantities,
// neighborhoods, and general crossroads are left to the contextual classifier.
export function deterministicCategories(text: string): PrivacyCategory[] {
  const categories: PrivacyCategory[] = []
  if (/\b\d{1,6}\s+(?:(?:[NSEW]|north|south|east|west)\.?\s+)?[\p{L}][\p{L}\s.'-]{1,55}\s+(?:st(?:reet)?|ave(?:nue)?|blvd|boulevard|rd|road|dr(?:ive)?|ln|lane|ct|court|pl|place|calle)\b/iu.test(text) || /\b(?:building|bldg)\s*#?\s*\d{2,6}\b/i.test(text)) {
    categories.push("exact_address")
  }
  if (/\b(?:apt|apartment|unit|suite|ste|room|rm|floor|piso|depto)\s*#?\s*(?:\d+[a-z]?|[a-z]\d+)\b/i.test(text) || /\b\d+(?:st|nd|rd|th)\s+floor\b/i.test(text)) {
    categories.push("unit_identifier")
  }
  if (/\b-?\d{1,2}\.\d{3,}\s*[,;]\s*-?\d{1,3}\.\d{3,}\b/.test(text) || /(?:maps\.google\.|google\.com\/maps|maps\.apple\.|goo\.gl\/maps|openstreetmap\.org\/\?mlat=)/i.test(text) || /\b[A-Z0-9]{4}\+[A-Z0-9]{2,}\b/i.test(text)) {
    categories.push("precise_location")
  }
  return categories
}

export type ScreeningDecision =
  | { kind: "safe"; categories: [] }
  | { kind: "review"; categories: PrivacyCategory[]; safeItems: string }
  | { kind: "blocked"; categories: PrivacyCategory[] }
  | { kind: "unavailable"; code: "missing_key" | "timeout" | "rate_limit" | "api_error" | "invalid_response" }

export type ScreenableNeed = { items: string; dietaryNotes: string | null; neighborhood: string }
export type Classify = (items: string, notes: string, neighborhood: string) => Promise<PrivacyClassification | Extract<ScreeningDecision, { kind: "unavailable" }>>

export async function evaluateScreening(
  input: ScreenableNeed,
  classify: Classify,
  log: (result: "none" | "flagged", code?: string) => void
): Promise<ScreeningDecision> {
  const notes = input.dietaryNotes ?? ""
  const patterns = deterministicCategories(`${input.items}\n${notes}`)
  if (patterns.length) {
    log("flagged")
    return { kind: "blocked", categories: patterns }
  }
  const first = await classify(input.items, notes, input.neighborhood)
  if ("kind" in first) {
    log("none", first.code)
    return first
  }
  if (first.riskLevel === "low") {
    log("none")
    return { kind: "safe", categories: [] }
  }
  if (first.riskLevel === "high") {
    log("flagged")
    return { kind: "blocked", categories: first.categories }
  }
  const candidate = first.suggestedRewrite?.trim()
  if (!candidate || candidate.length > 200 || deterministicCategories(candidate).length) {
    log("flagged")
    return { kind: "blocked", categories: first.categories }
  }
  const second = await classify(candidate, "", input.neighborhood)
  if ("kind" in second) {
    log("flagged", second.code)
    return second
  }
  if (second.riskLevel !== "low") {
    log("flagged")
    return { kind: "blocked", categories: first.categories }
  }
  log("flagged")
  return { kind: "review", categories: first.categories, safeItems: candidate }
}

export function genericRewrite(category: string, neighborhood: string) {
  const resource = category === "food" ? "food" : category === "clothing" ? "clothing" : category === "hygiene" ? "hygiene supplies" : "essential supplies"
  return `Our outreach team needs ${resource} in ${neighborhood}.`
}
