import { z } from "zod"

export const PRIVACY_CATEGORIES = [
  "exact_address",
  "unit_identifier",
  "precise_location",
  "vulnerable_person_identification",
  "personal_identifier",
  "contact_information",
  "government_identifier",
] as const

export type PrivacyCategory = (typeof PRIVACY_CATEGORIES)[number]

const Category = z.enum(PRIVACY_CATEGORIES)
const Classification = z.strictObject({
  approved: z.boolean(),
  riskLevel: z.enum(["low", "medium", "high"]),
  categories: z.array(Category).max(PRIVACY_CATEGORIES.length),
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

export type ScreeningDecision =
  | { kind: "safe"; categories: [] }
  | { kind: "review"; categories: PrivacyCategory[]; safeItems: string }
  | { kind: "blocked"; categories: PrivacyCategory[] }
  | { kind: "unavailable"; code: "missing_key" | "timeout" | "rate_limit" | "api_error" | "invalid_response" | "local_error" }

export type ScreenableNeed = { items: string; dietaryNotes: string | null; neighborhood: string }
declare const sanitizedNeedBrand: unique symbol
/** Constructed only by sanitizeNeedLocally; the Anthropic adapter accepts this type. */
export type SanitizedNeed = Readonly<ScreenableNeed> & { readonly [sanitizedNeedBrand]: true }
export type Classify = (need: SanitizedNeed) => Promise<PrivacyClassification | Extract<ScreeningDecision, { kind: "unavailable" }>>

type Finding = { start: number; end: number; category: PrivacyCategory; replacement: string }

const LOCAL_PATTERNS: { category: PrivacyCategory; expression: RegExp; replacement: string }[] = [
  { category: "contact_information", expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu, replacement: "[EMAIL]" },
  { category: "contact_information", expression: /(?<!\d)(?:\+?1[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/gu, replacement: "[PHONE_NUMBER]" },
  { category: "government_identifier", expression: /\b\d{3}[- ]\d{2}[- ]\d{4}\b/gu, replacement: "[GOVERNMENT_ID]" },
  { category: "government_identifier", expression: /\b(?:driver'?s? license|state id|passport|government id|ssn|social security(?: number)?|identification number|n[uú]mero de identificaci[oó]n|licencia de conducir|pasaporte|seguro social|curp|rfc|itin)\s*(?::|#|number|no\.?|is|n[uú]mero|es|\s)\s*[A-Z0-9][A-Z0-9-]{3,19}\b/giu, replacement: "[GOVERNMENT_ID]" },
  { category: "exact_address", expression: /\b\d{1,6}\s+(?:(?:[NSEW]|north|south|east|west)\.?\s+)?[\p{L}][\p{L}\s.'-]{1,55}\s+(?:st(?:reet)?|ave(?:nue)?|blvd|boulevard|rd|road|dr(?:ive)?|ln|lane|ct|court|pl|place|calle)\b/giu, replacement: "[STREET_ADDRESS]" },
  { category: "exact_address", expression: /\b\d{1,6}\s+(?:calle|avenida|av\.?|callej[oó]n|paseo|carrera|carretera)\s+[\p{L}\d][\p{L}\d\s.'-]{1,45}/giu, replacement: "[STREET_ADDRESS]" },
  { category: "exact_address", expression: /\b(?:calle|avenida|av\.?|callej[oó]n|paseo|carrera|carretera)\s+[\p{L}\d][\p{L}\d\s.'-]{1,45}\s+\d{1,6}\b/giu, replacement: "[STREET_ADDRESS]" },
  { category: "exact_address", expression: /\b(?:building|bldg)\s*#?\s*\d{2,6}\b/giu, replacement: "[BUILDING_NUMBER]" },
  { category: "unit_identifier", expression: /\b(?:apt|apartment|apartamento|unit|suite|ste|room|rm|floor|piso|depto|departamento|habitaci[oó]n)\s*#?\s*(?:\d+[a-z]?|[a-z]\d+)\b/giu, replacement: "[UNIT_NUMBER]" },
  { category: "unit_identifier", expression: /\b\d+(?:st|nd|rd|th)\s+floor\b/giu, replacement: "[UNIT_NUMBER]" },
  { category: "precise_location", expression: /\b-?\d{1,2}\.\d{3,}\s*[,;]\s*-?\d{1,3}\.\d{3,}\b/gu, replacement: "[COORDINATES]" },
  { category: "precise_location", expression: /(?:https?:\/\/)?(?:maps\.google\.|google\.com\/maps|maps\.apple\.|maps\.app\.goo\.gl|goo\.gl\/maps|waze\.com\/ul|openstreetmap\.org\/\?mlat=)[^\s,;]*/giu, replacement: "[PRECISE_MAP_LOCATION]" },
  { category: "precise_location", expression: /\b[A-Z0-9]{4,8}\+[A-Z0-9]{2,3}\b/giu, replacement: "[PRECISE_MAP_LOCATION]" },
  { category: "personal_identifier", expression: /\b(?:full name|name|client|recipient|my friend|our guest|person named|client named|recipient named)\s*(?::|is|named|called)?\s+[\p{Lu}][\p{Ll}'-]+(?:\s+[\p{Lu}][\p{Ll}'-]+){1,2}\b/gu, replacement: "[PERSON]" },
  { category: "personal_identifier", expression: /\b(?:nombre completo|nombre|cliente|destinatario|mi amigo|mi amiga|persona llamada|cliente llamada|cliente llamado)\s*(?::|es|llamado|llamada)?\s+[\p{Lu}][\p{Ll}'-]+(?:\s+[\p{Lu}][\p{Ll}'-]+){1,2}\b/giu, replacement: "[PERSON]" },
  { category: "vulnerable_person_identification", expression: /\b[\p{Lu}][\p{Ll}'-]+(?:\s+[\p{Lu}][\p{Ll}'-]+)?\s+(?:is|was|sleeps|shelters|stays|gathers|camps)\s+(?:sleeping|sheltering|staying|gathering|camping|at|under|near|in)\b/giu, replacement: "[SENSITIVE_PERSON_CONTEXT]" },
  { category: "vulnerable_person_identification", expression: /\b[\p{Lu}][\p{Ll}'-]+\s+[\p{Lu}][\p{Ll}'-]+\s+(?:est[aá]|estaba)\s+(?:durmiendo|refugi[aá]ndose|qued[aá]ndose|reuni[eé]ndose|acampando)\b/giu, replacement: "[SENSITIVE_PERSON_CONTEXT]" },
  { category: "vulnerable_person_identification", expression: /\b(?:people|person|individuals|someone|folks|they|clients?|unhoused people|homeless people)\b.{0,60}\b(?:sleep(?:ing|s)?|shelter(?:ing|s)?|stay(?:ing|s)?|gather(?:ing|s)?|camp(?:ing|s)?)\b.{0,70}\b(?:under|beneath|behind|inside|outside|at|near|by|in)\s+(?:the\s+)?(?:[\p{Lu}][\p{L}\p{N}'-]*\s+){0,4}(?:bridge|overpass|viaduct|station|train station|subway station|transit stop|bus stop|shelter|church|library|park|alley|parking lot|building|encampment|tunnel)\b/giu, replacement: "[SENSITIVE_LOCATION]" },
  { category: "vulnerable_person_identification", expression: /\b(?:personas|gente|alguien|clientes)\b.{0,60}\b(?:durmiendo|duermen|refugi[aá]ndose|se refugian|qued[aá]ndose|se quedan|reuni[eé]ndose|se re[uú]nen|acampando)\b.{0,70}\b(?:debajo de|bajo|detr[aá]s de|dentro de|afuera de|en|cerca de|junto a)\s+(?:el|la|los|las)?\s*(?:[\p{Lu}][\p{L}\p{N}'-]*\s+){0,4}(?:puente|estaci[oó]n|parada|refugio|iglesia|biblioteca|parque|callej[oó]n|estacionamiento|edificio|campamento|t[uú]nel)\b/giu, replacement: "[SENSITIVE_LOCATION]" },
]

function collectFindings(text: string): Finding[] {
  const findings: Finding[] = []
  for (const { category, expression, replacement } of LOCAL_PATTERNS) {
    expression.lastIndex = 0
    for (const match of text.matchAll(expression)) {
      if (match.index === undefined) continue
      findings.push({ start: match.index, end: match.index + match[0].length, category, replacement })
    }
  }
  return findings.sort((a, b) => a.start - b.start || b.end - a.end)
}

function redact(text: string, findings: Finding[]) {
  let cursor = 0
  let result = ""
  for (const finding of findings) {
    if (finding.start < cursor) continue
    result += text.slice(cursor, finding.start) + finding.replacement
    cursor = finding.end
  }
  return result + text.slice(cursor)
}

export function deterministicCategories(text: string): PrivacyCategory[] {
  return [...new Set(collectFindings(text).map((finding) => finding.category))]
}

/** Redacts recognizable sensitive spans locally and returns only category labels alongside the result. */
export function sanitizeTextLocally(text: string): { text: string; categories: PrivacyCategory[] } {
  const findings = collectFindings(text)
  return { text: redact(text, findings), categories: [...new Set(findings.map((finding) => finding.category))] }
}

/** Local privacy pass for all request text; the brand prevents raw input reaching the AI adapter by accident. */
export function sanitizeNeedLocally(input: ScreenableNeed): { need: SanitizedNeed; categories: PrivacyCategory[] } {
  const items = sanitizeTextLocally(input.items)
  const notes = sanitizeTextLocally(input.dietaryNotes ?? "")
  const neighborhood = sanitizeTextLocally(input.neighborhood)
  const categories = [...new Set([...items.categories, ...notes.categories, ...neighborhood.categories])]
  return {
    need: { items: items.text, dietaryNotes: notes.text || null, neighborhood: neighborhood.text } as SanitizedNeed,
    categories,
  }
}

/** The only user payload shape accepted by the Anthropic adapter. */
export function anthropicScreeningPayload(need: SanitizedNeed) {
  return { items: need.items, notes: need.dietaryNotes ?? "", neighborhood: need.neighborhood }
}

export async function evaluateScreening(
  input: ScreenableNeed,
  classify: Classify,
  log: (result: "none" | "flagged", code?: string) => void,
  localScan: typeof sanitizeNeedLocally = sanitizeNeedLocally
): Promise<ScreeningDecision> {
  let local: ReturnType<typeof sanitizeNeedLocally>
  try {
    local = localScan(input)
  } catch {
    log("none", "local_error")
    return { kind: "unavailable", code: "local_error" }
  }
  if (local.categories.length) {
    log("flagged")
    return { kind: "blocked", categories: local.categories }
  }
  let first: Awaited<ReturnType<Classify>>
  try {
    first = await classify(local.need)
  } catch {
    log("none", "api_error")
    return { kind: "unavailable", code: "api_error" }
  }
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
  if (!candidate || candidate.length > 200) {
    log("flagged")
    return { kind: "blocked", categories: first.categories }
  }
  let safeCandidate: ReturnType<typeof sanitizeNeedLocally>
  try {
    safeCandidate = localScan({ items: candidate, dietaryNotes: null, neighborhood: input.neighborhood })
  } catch {
    log("flagged", "local_error")
    return { kind: "unavailable", code: "local_error" }
  }
  if (safeCandidate.categories.length) {
    log("flagged")
    return { kind: "blocked", categories: [...new Set([...first.categories, ...safeCandidate.categories])] }
  }
  let second: Awaited<ReturnType<Classify>>
  try {
    second = await classify(safeCandidate.need)
  } catch {
    log("flagged", "api_error")
    return { kind: "unavailable", code: "api_error" }
  }
  if ("kind" in second) {
    log("flagged", second.code)
    return second
  }
  if (second.riskLevel !== "low") {
    log("flagged")
    return { kind: "blocked", categories: first.categories }
  }
  log("flagged")
  return { kind: "review", categories: first.categories, safeItems: safeCandidate.need.items }
}

export function genericRewrite(category: string, neighborhood: string) {
  const resource = category === "food" ? "food" : category === "clothing" ? "clothing" : category === "hygiene" ? "hygiene supplies" : "essential supplies"
  return `Our outreach team needs ${resource} in ${neighborhood}.`
}
