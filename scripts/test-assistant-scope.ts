// Offline contract checks for the assistant's server-only prompt. These questions are
// representative scenarios; live model replies still need a separate review.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const prompt = readFileSync("src/lib/assistant-prompt.ts", "utf8")
const scenarios = [
  ["housing resources", /housing, shelter/i],
  ["replacing a state ID", /identification and vital documents/i],
  ["more than food", /food, water, hygiene, clothing/i],
  ["GED programs", /employment, education/i],
  ["employment support", /employment/i],
  ["healthcare", /healthcare and wellness/i],
  ["legal and reentry help", /legal aid and reentry/i],
  ["Needs Board process", /Needs Board/],
] as const

for (const [question, topic] of scenarios) {
  assert.match(prompt, topic, `Prompt should cover ${question}`)
  console.log(`PASS assistant scope: ${question}`)
}
assert.doesNotMatch(prompt, /Medical care, documents, benefits.*planned for later/i)
assert.match(prompt, /Do not invent specific organizations, addresses, eligibility rules, hours, or availability/i)
assert.match(prompt, /Do not ask for, and do not accept, names, addresses/i)
assert.match(prompt, /dedicated Inbox page/i)
console.log("PASS assistant limits and privacy")
