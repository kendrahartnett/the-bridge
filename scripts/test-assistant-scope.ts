// Offline contract checks for the assistant's server-only prompt. These questions are
// representative scenarios; live model replies still need a separate review.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const prompt = readFileSync("src/lib/assistant-prompt.ts", "utf8")
const scenarios = [
  ["housing and shelter resources", /emergency shelter, transitional or supportive housing/i],
  ["replacing a state ID", /state IDs, driver's licenses, birth certificates/i],
  ["food and basic necessities", /food, water, meals, clothing and shoes/i],
  ["GED and adult education", /GED, adult education, college, vocational training/i],
  ["employment support", /jobs, training, resumes, interviews and workforce development/i],
  ["healthcare and benefits", /healthcare, mental health, substance-use treatment and benefits navigation/i],
  ["legal and reentry help", /legal aid, record-related help and reentry/i],
  ["transportation and transit", /transportation, public transit, outreach and community organizations/i],
  ["other community resources", /other essential community resources/i],
  ["Needs Board process", /Needs Board/],
] as const

for (const [question, topic] of scenarios) {
  assert.match(prompt, topic, `Prompt should cover ${question}`)
  console.log(`PASS assistant scope: ${question}`)
}
assert.doesNotMatch(prompt, /Medical care, documents, benefits.*planned for later/i)
assert.match(prompt, /Food is one resource area, not the default answer/i)
assert.match(prompt, /never redirect a housing, identification, education, employment, healthcare, legal, transportation, or other question to food assistance/i)
assert.match(prompt, /Requests may be for supplies, services, information, referrals or other support/i)
assert.match(prompt, /Do not invent specific organizations, addresses, eligibility rules, hours, or availability/i)
assert.match(prompt, /Do not ask for, and do not accept, names, addresses/i)
assert.match(prompt, /dedicated Inbox page/i)
console.log("PASS assistant limits and privacy")
