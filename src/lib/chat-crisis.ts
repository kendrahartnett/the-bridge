/** Deterministic crisis signals for the public chat route; this never calls an AI provider. */
const CRISIS_PATTERNS = [
  /\b(?:suicid(?:e|al|ing)?|self[-\s]?harm|kill(?:ing)? myself|take my own life|end my life|end it all|want(?:ing)? to die|do not want to live|don't want to live|hurt(?:ing)? myself|harm(?:ing)? myself|cut(?:ting)? myself|overdose myself)\b/iu,
  /\b(?:suicid(?:arme|ar|io|a|ida)|quitarme la vida|acabar con mi vida|no quiero vivir|no quiero seguir viviendo|quiero morir|ganas de morir|me quiero matar|quiero hacerme da[nñ]o|pensando en hacerme da[nñ]o|lastimarme|autolesi[oó]n)\b/iu,
]

export function isCrisisMessage(text: string) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text))
}
