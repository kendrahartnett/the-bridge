// Offline privacy boundary checks. No database or real Anthropic request is used.
import assert from "node:assert/strict"

import {
  anthropicScreeningPayload,
  deterministicCategories,
  evaluateScreening,
  sanitizeNeedLocally,
  sanitizeTextLocally,
  type PrivacyClassification,
  type SanitizedNeed,
} from "../src/lib/privacy-screening-core.ts"

const safe: PrivacyClassification = {
  approved: true,
  riskLevel: "low",
  categories: [],
  reason: "No concern.",
  suggestedRewrite: null,
}
const need = (items: string, dietaryNotes: string | null = null) => ({
  items,
  dietaryNotes,
  neighborhood: "Logan Square",
})
let passed = 0
function check(label: string, condition: unknown) {
  assert.ok(condition, label)
  passed++
  console.log(`PASS ${label}`)
}

const examples = [
  ["street address", "Bring supplies to 1234 N Example Street.", "exact_address"],
  ["unit number", "Please leave it in apartment 4B.", "unit_identifier"],
  ["GPS coordinates", "Meet at 41.8781, -87.6298.", "precise_location"],
  ["precise map link", "https://maps.google.com/?q=41.8781,-87.6298", "precise_location"],
  ["full plus code", "Use 849VCWC8+R9", "precise_location"],
  ["short map link", "https://maps.app.goo.gl/AbCdEf123", "precise_location"],
  ["email address", "Contact Jordan at jordan.synthetic@example.test.", "contact_information"],
  ["phone number", "Call (312) 555-0147 for the handoff.", "contact_information"],
  ["Social Security number", "SSN 123-45-6789", "government_identifier"],
  ["named person", "Full name: Jordan Example", "personal_identifier"],
  ["named person with a vulnerable location", "Full name: Jordan Example is sleeping under the Blue Line station.", "personal_identifier"],
  ["vulnerable location context", "People are sleeping under the Blue Line station.", "vulnerable_person_identification"],
  ["Spanish named person", "Nombre completo: Jordan Ejemplo", "personal_identifier"],
  ["Spanish exact address", "Entrega en 123 Calle Ejemplo", "exact_address"],
] as const

for (const [label, text, category] of examples) {
  check(`${label} is detected locally`, deterministicCategories(text).includes(category))
}

const sanitizedEmail = sanitizeTextLocally("Email jordan.synthetic@example.test for help")
check("email redaction replaces the sensitive value with a placeholder", sanitizedEmail.text === "Email [EMAIL] for help")
check("redaction returns only a category label", sanitizedEmail.categories.join() === "contact_information")
const sanitizedAddress = sanitizeTextLocally("Deliver to 1234 N Example Street, unit 4B")
check("address and unit values are replaced before any outbound use", !sanitizedAddress.text.includes("1234") && !sanitizedAddress.text.includes("4B") && sanitizedAddress.text.includes("[STREET_ADDRESS]") && sanitizedAddress.text.includes("[UNIT_NUMBER]"))

const ordinary = sanitizeNeedLocally(need("Winter coats for outreach in Logan Square"))
check("general neighborhood and ordinary request remain clear", ordinary.categories.length === 0 && ordinary.need.neighborhood === "Logan Square")
check("general area and crossroads remain clear", deterministicCategories("Meet people near North Avenue and Western Avenue in the South Side") .length === 0)

const outbound: string[] = []
const logs: string[] = []
const localSensitive = "Synthetic submission marker; Jordan's group is at 1234 N Example Street, unit 4B."
const blocked = await evaluateScreening(need(localSensitive), async (sanitized: SanitizedNeed) => {
  outbound.push(JSON.stringify(anthropicScreeningPayload(sanitized)))
  return safe
}, (result, code) => logs.push(`${result}:${code ?? ""}`))
check("local high-risk findings block before the mocked AI client", blocked.kind === "blocked" && outbound.length === 0)
check("known sensitive values never appear in outbound AI requests", !outbound.some((payload) => /Jordan|1234|4B|Synthetic submission marker/.test(payload)))
check("screening logs contain only a result and optional code", logs.join() === "flagged:")

const cleanOutbound: string[] = []
const cleanResult = await evaluateScreening(need("20 winter coats for an outreach team in Logan Square"), async (sanitized) => {
  cleanOutbound.push(JSON.stringify(anthropicScreeningPayload(sanitized)))
  return safe
}, () => {})
check("a locally clear submission reaches the classifier as sanitized fields", cleanResult.kind === "safe" && cleanOutbound.length === 1 && cleanOutbound[0].includes('"neighborhood":"Logan Square"'))
assert.deepEqual(JSON.parse(cleanOutbound[0]), {
  items: "20 winter coats for an outreach team in Logan Square",
  notes: "",
  neighborhood: "Logan Square",
})
check("outbound payload contains only the three screened request fields", Object.keys(JSON.parse(cleanOutbound[0])).sort().join() === "items,neighborhood,notes")

let overrideCalls = 0
const attemptedOverride = await evaluateScreening(need("Send coats to 1234 N Example Street"), async () => {
  overrideCalls++
  return safe
}, () => {})
check("an AI safe response cannot override a local finding", attemptedOverride.kind === "blocked" && overrideCalls === 0)

const nameOnly = await evaluateScreening(need("Full name: Jordan Example"), async () => {
  throw new Error("should not call external AI")
}, () => {})
check("a full name with an explicit identifying cue is blocked locally", nameOnly.kind === "blocked")

const multiple = sanitizeNeedLocally(need("Full name: Jordan Example", "Contact jordan.synthetic@example.test or (312) 555-0147"))
check("multiple PII categories are found and sanitized together", multiple.categories.includes("personal_identifier") && multiple.categories.includes("contact_information") && !JSON.stringify(multiple.need).includes("Jordan") && !JSON.stringify(multiple.need).includes("jordan.synthetic@example.test") && !JSON.stringify(multiple.need).includes("555-0147"))

const candidateOutbound: string[] = []
let classifierCalls = 0
const unsafeSuggestion = await evaluateScreening(need("A context that needs review"), async (sanitized) => {
  classifierCalls++
  candidateOutbound.push(JSON.stringify(anthropicScreeningPayload(sanitized)))
  return classifierCalls === 1
    ? { ...safe, approved: false, riskLevel: "medium", categories: ["vulnerable_person_identification"], suggestedRewrite: "Email jordan.synthetic@example.test at the shelter" }
    : safe
}, () => {})
check("a sensitive AI suggested rewrite is blocked before a second outbound request", unsafeSuggestion.kind === "blocked" && classifierCalls === 1 && candidateOutbound.length === 1 && !candidateOutbound[0].includes("jordan.synthetic@example.test"))

const localFailureLogs: string[] = []
let calledAfterLocalFailure = false
const failedLocal = await evaluateScreening(need("Winter coats"), async () => {
  calledAfterLocalFailure = true
  return safe
}, (result, code) => localFailureLogs.push(`${result}:${code ?? ""}`), () => { throw new Error("synthetic local scanner failure") })
check("local screening failure fails closed before any AI call", failedLocal.kind === "unavailable" && failedLocal.code === "local_error" && !calledAfterLocalFailure)
check("local failure log contains only its code", localFailureLogs.join() === "none:local_error")

const apiFailure = await evaluateScreening(need("Winter coats"), async () => ({ kind: "unavailable", code: "api_error" }), () => {})
check("external AI failure fails closed", apiFailure.kind === "unavailable" && apiFailure.code === "api_error")

const reviewCandidate = await evaluateScreening(need("A context that needs review"), async (sanitized) => sanitized.items.startsWith("A context")
  ? { approved: false, riskLevel: "medium", categories: ["vulnerable_person_identification"], reason: "Review needed.", suggestedRewrite: "Winter coats for outreach" }
  : safe, () => {})
check("medium risk can use the existing private review flow with safe wording", reviewCandidate.kind === "review" && reviewCandidate.safeItems === "Winter coats for outreach")

console.log(`${passed} offline outbound privacy checks passed`)
