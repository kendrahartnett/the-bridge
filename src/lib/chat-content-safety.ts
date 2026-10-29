import { sanitizeTextLocally, type PrivacyCategory } from "./privacy-screening-core.ts"
import { isCrisisMessage } from "./chat-crisis.ts"

export type ChatSensitiveCategory = PrivacyCategory | "person_name" | "health_information"
export type ChatTextScan = typeof sanitizeTextLocally
export type ChatContentDecision =
  | { kind: "safe" }
  | { kind: "crisis" }
  | { kind: "sensitive"; categories: ChatSensitiveCategory[] }

// Deliberately contextual: these checks catch common personal disclosures without treating
// every mention of a name or a health topic as personal information.
const PERSON_NAME_PATTERNS = [
  /\b(?:my|our)\s+(?:friend|neighbor|client|guest|mother|mom|father|dad|sister|brother|child|son|daughter)\s+(?:named\s+)?\p{Lu}[\p{L}\p{M}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30})?/u,
  /\b(?:mi|nuestro|nuestra)\s+(?:amigo|amiga|vecino|vecina|cliente|hu[eé]sped|madre|mam[aá]|padre|hermano|hermana|hijo|hija)\s+(?:llamado|llamada|de nombre\s+)?\p{Lu}[\p{L}\p{M}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30})?/iu,
  /\b(?:person|friend|neighbor|client|guest|persona|amigo|amiga|vecino|vecina|cliente)\s+(?:named|called|llamado|llamada)\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30})?/iu,
  /\b\p{Lu}[\p{L}\p{M}'’.-]{1,30}\s+(?:needs?|is sleeping|sleeps?|shelters?|stays?|lives?)\s+(?:emergency\s+)?(?:shelter|housing|under|beneath|behind|at|near|in)\b/u,
  /\b(?:my name is|i am|i'm|this is|me llamo|mi nombre es)\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30}(?:\s+\p{Lu}[\p{L}\p{M}'’.-]{1,30})?/iu,
]

const HEALTH_TERM = String.raw`(?:diabetes|insulin|HIV|AIDS|cancer|asthma|epilepsy|seizures?|schizophrenia|bipolar|PTSD|depression|anxiety|pregnan(?:t|cy)|allerg(?:y|ies|ic)|opioids?|overdose|medications?|prescriptions?|inhalers?|chemotherapy|dialysis|heart condition|blood pressure|wheelchair|disabilit(?:y|ies)|VIH|SIDA|c[aá]ncer|asma|epilepsia|convulsiones|esquizofrenia|trastorno bipolar|TEPT|depresi[oó]n|ansiedad|embarazad[ao]|embarazo|alergias?|opioides?|medicamentos?|recetas?|inhaladores?|quimioterapia|di[aá]lisis|silla de ruedas|discapacidad)`
const HEALTH_DISCLOSURE_PATTERNS = [
  new RegExp(String.raw`\b(?:i|we|my|my friend|my family|my child|my partner|he|she|they)\b[\s\S]{0,70}\b(?:have|has|had|was diagnosed with|were diagnosed with|takes?|uses?|needs?|is pregnant|are pregnant|is allergic to|are allergic to)\b[\s\S]{0,50}\b${HEALTH_TERM}\b`, "iu"),
  new RegExp(String.raw`\b(?:tengo|tiene|tenemos|me diagnosticaron|est[aá] diagnosticad[ao]|tomo|toma|usamos?|uso|necesito|necesita|est[aá] embarazad[ao]|es al[eé]rgic[ao] a)\b[\s\S]{0,70}\b${HEALTH_TERM}\b`, "iu"),
  new RegExp(String.raw`\b(?:i|we|my friend|my child|he|she|they)\b[\s\S]{0,30}\b(?:need|needs|take|takes|use|uses)\b[\s\S]{0,30}\b(?:insulin|medication|medications|prescription|inhaler|wheelchair|insulina|medicamento|medicamentos|receta|inhalador|silla de ruedas)\b`, "iu"),
  new RegExp(String.raw`\b(?:necesito|necesita|necesitamos|tomo|toma|uso|usa)\b[\s\S]{0,30}\b(?:insulina|medicamento|medicamentos|receta|inhalador|silla de ruedas)\b`, "iu"),
]

export function scanChatText(text: string, scan: ChatTextScan = sanitizeTextLocally): ChatContentDecision {
  if (isCrisisMessage(text)) return { kind: "crisis" }

  const categories = new Set<ChatSensitiveCategory>(scan(text).categories)
  if (PERSON_NAME_PATTERNS.some((pattern) => pattern.test(text))) categories.add("person_name")
  if (HEALTH_DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text))) categories.add("health_information")
  return categories.size ? { kind: "sensitive", categories: [...categories] } : { kind: "safe" }
}
