// Clean-up applied to every assistant reply before it is shown. Plain functions (relative
// imports) so scripts/test-assistant-reply.ts can run them directly with Node.

import { SPANISH_GLOSSARY } from "./copy.ts"

// The end of a sentence: . ! ? or … plus any closing quote or bracket, followed by a space
// or the end of the text. Numbered list markers ("2.") at the start of a line don't count.
const SENTENCE_END = /(?<!^[ \t]*\d{1,2})[.!?…]["'”’)\]]*(?=\s|$)/gm

/** A reply cut off by the token limit, trimmed back to its last full sentence ("" if none). */
export function trimToLastSentence(text: string) {
  const last = [...text.matchAll(SENTENCE_END)].at(-1)
  return last ? text.slice(0, last.index + last[0].length).trim() : ""
}

const SPANISH_WORDS = /\b(el|la|los|las|de|del|que|y|en|para|una|un|por|con|es|tu|puedes|si)\b/gi
const ENGLISH_WORDS = /\b(the|and|to|of|you|your|a|an|is|for|with|on|it|can|if)\b/gi

/** Rough language check on a reply: true when it has more English than Spanish words. */
export function isEnglish(text: string) {
  return (text.match(ENGLISH_WORDS)?.length ?? 0) > (text.match(SPANISH_WORDS)?.length ?? 0)
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

// "Publicar una necesidad (Post a Need)" or "Post a Need (Publicar una necesidad)", in any
// letter case and with or without quotes around the first label, becomes the English label
// (keeping those quotes).
const LABEL_PAIRS = SPANISH_GLOSSARY.flatMap(([en, es]) => [
  [new RegExp(`(["“]?)${escape(es)}(["”]?) \\(${escape(en)}\\)`, "gi"), `$1${en}$2`],
  [new RegExp(`(["“]?)${escape(en)}(["”]?) \\(${escape(es)}\\)`, "gi"), `$1${en}$2`],
] as const)

// Multi-word Spanish terms on their own ("trabajador de alcance comunitario"). Single words
// are left alone because some are also English words ("Panel").
const OUTREACH_A = /\ba trabajador de alcance comunitario/gi
const OUTREACH_PLURAL = /trabajadores de alcance comunitario/gi
const SPANISH_PHRASES = SPANISH_GLOSSARY.filter(([, es]) => es.includes(" ")).map(
  ([en, es]) => [new RegExp(escape(es), "gi"), en === "Outreach worker" ? "outreach worker" : en] as const
)

/**
 * English replies use English labels only. The prompt asks for this, but the model sometimes
 * carries the Spanish glossary terms into English replies, so replace any that slip through.
 */
export function stripSpanishLabels(text: string) {
  if (!isEnglish(text)) return text
  const paired = LABEL_PAIRS.reduce((out, [pattern, en]) => out.replace(pattern, en), text)
  return SPANISH_PHRASES.reduce(
    (out, [pattern, en]) => out.replace(pattern, en),
    paired.replace(OUTREACH_A, "an outreach worker").replace(OUTREACH_PLURAL, "outreach workers")
  )
}
