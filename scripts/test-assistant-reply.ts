// Checks the clean-up applied to every assistant reply (src/lib/assistant-reply.ts).
//
//   npm run test:assistant-reply
//
// No network, no database, no API key. The English examples are real replies from the live
// tests (docs/assistant-tests.md) that carried Spanish labels into English.

import {
  collapseNestedParentheses,
  isEnglish,
  stripSpanishLabels,
  trimToLastSentence,
} from "../src/lib/assistant-reply.ts"

let failed = 0
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected
  if (!ok) failed++
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `\n      got:      ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`}`)
}

// Trimming replies cut off by the token limit.
check("Cut-off Spanish reply ends at its last full sentence",
  trimToLastSentence("Hola. Esto es una prueba. Después coordinarás con quien publicó la nec"),
  "Hola. Esto es una prueba.")
check("Numbered list markers are not sentence ends",
  trimToLastSentence('Steps:\n1. Sign in.\n2. Choose "Post a Need".\n3. Fill in the'),
  'Steps:\n1. Sign in.\n2. Choose "Post a Need".')
check("Questions and closing brackets count as sentence ends",
  trimToLastSentence("¿Necesitas ayuda? Llama al 211 (gratis).\n10. Abre el pan"),
  "¿Necesitas ayuda? Llama al 211 (gratis).")
check("No full sentence at all gives an empty reply (the route then sends the fallback)",
  trimToLastSentence("no sentence end at all"), "")

// Spanish labels in English replies.
check("English reply: Spanish term with English label in parentheses",
  stripSpanishLabels("To post, sign in, choose Publicar una necesidad (Post a Need), and fill in the form."),
  "To post, sign in, choose Post a Need, and fill in the form.")
check("English reply: several labels, including Panel (Dashboard)",
  stripSpanishLabels("Organizations sign in and browse open requests on their Panel (Dashboard). When they find one they can help with, they choose Ofrecer apoyo (Offer Support)."),
  "Organizations sign in and browse open requests on their Dashboard. When they find one they can help with, they choose Offer Support.")
check("English reply: English label with Spanish in parentheses",
  stripSpanishLabels("Once an organization chooses Offer Support (Ofrecer apoyo), the request moves to In Progress (En curso). It then becomes Fulfilled (Completada)."),
  "Once an organization chooses Offer Support, the request moves to In Progress. It then becomes Fulfilled.")
check("English reply: quoted Spanish label keeps its quotes",
  stripSpanishLabels('You can still post a request through "Publicar una necesidad" (Post a Need) once you sign in.'),
  'You can still post a request through "Post a Need" once you sign in.')
check("English reply: Spanish outreach worker term on its own",
  stripSpanishLabels("If you're a trabajador de alcance comunitario or work with an organization, you can sign in."),
  "If you're an outreach worker or work with an organization, you can sign in.")
check("English reply: plural Spanish outreach worker term",
  stripSpanishLabels("The Bridge is for trabajadores de alcance comunitario and community members."),
  "The Bridge is for outreach workers and community members.")
check("English reply without labels is unchanged",
  stripSpanishLabels("Housing is planned, but it isn't available yet. You can call or text 211."),
  "Housing is planned, but it isn't available yet. You can call or text 211.")

const spanish =
  "Para publicar una necesidad (Post a Need) en The Bridge, inicia sesión y elige Publicar una necesidad (Post a Need). La solicitud aparecerá como Abierta (Open) en tu panel."
check("Spanish reply is detected as Spanish", isEnglish(spanish), false)
check("Spanish reply keeps its English labels in parentheses", stripSpanishLabels(spanish), spanish)

// Nested parentheses in Spanish replies. The first three inputs are real replies from the
// live tests.
check("Spanish: label repeated inside its own parentheses",
  collapseNestedParentheses("Completa el formulario con el tipo de apoyo, cuántas personas, el barrio (Barrio (Neighborhood)), notas opcionales y el período de tiempo."),
  "Completa el formulario con el tipo de apoyo, cuántas personas, el barrio (Neighborhood), notas opcionales y el período de tiempo.")
check("Spanish: a list of labels inside parentheses becomes a list after a colon",
  collapseNestedParentheses("Por ahora, se enfoca en recursos esenciales como comida, ropa y artículos de higiene (Comida (Food), Ropa (Clothing), Artículos de higiene (Hygiene supplies) u Otro (Other))."),
  "Por ahora, se enfoca en recursos esenciales como comida, ropa y artículos de higiene: Comida (Food), Ropa (Clothing), Artículos de higiene (Hygiene supplies) u Otro (Other).")
check("Spanish: nested list in the middle of a sentence",
  collapseNestedParentheses("3. Llena el formulario: el tipo de apoyo (Comida (Food), Ropa (Clothing), Artículos de higiene (Hygiene supplies) u Otro (Other)), qué se necesita, cuántas personas, el barrio y el período de tiempo."),
  "3. Llena el formulario: el tipo de apoyo: Comida (Food), Ropa (Clothing), Artículos de higiene (Hygiene supplies) u Otro (Other), qué se necesita, cuántas personas, el barrio y el período de tiempo.")
check("Spanish: two nested groups in one reply are both fixed",
  collapseNestedParentheses("Elige el barrio (Barrio (Neighborhood)) y el tipo de apoyo (Comida (Food) u Otro (Other)) en el formulario."),
  "Elige el barrio (Neighborhood) y el tipo de apoyo: Comida (Food) u Otro (Other) en el formulario.")
const flat = "Elige Publicar una necesidad (Post a Need). Aparecerá como Abierta (Open) en tu panel (Dashboard)."
check("Spanish: parentheses that aren't nested are unchanged", collapseNestedParentheses(flat), flat)
const english = "Choose the type of support (Food (or Other)) on the form, and the neighborhood."
check("English replies are never changed by the Spanish fix", collapseNestedParentheses(english), english)

console.log(`\n${failed === 0 ? "All checks passed" : `${failed} failed`}`)
process.exit(failed === 0 ? 0 : 1)
