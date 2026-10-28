# Privacy screening data flow

## Submission path

The Post a Need form submits to a server action. The server validates the form and account permissions, then calls the server-only privacy screener in `src/lib/privacy-screening.ts`. There is no separate HTTP route for creating a need. Resubmissions use the same create rule. Admin approval calls the same screener on the exact stored safe draft before publishing it.

The local pass in `src/lib/privacy-screening-core.ts` runs before the Anthropic adapter. It looks for recognizable emails, phone numbers, Social Security and labeled government identifiers, address and unit patterns, coordinates and map links, explicitly cued names, and specific vulnerable-person landmark descriptions. It replaces detected spans with placeholders in its sanitized representation and returns category labels only. If it finds a sensitive pattern, the submission is blocked and no Anthropic request or database write occurs.

If the local pass finds no known sensitive pattern, the adapter accepts only the branded `SanitizedNeed` type produced by that pass. It sends only the request description, notes, and selected community area to Anthropic. It does not send the account name, email, account ID, people count, category, or time window. The AI response is schema-validated. A medium-risk rewrite is locally screened again before its second AI check and before it can be stored for admin review.

## Persistence and access

- Locally blocked submissions are not stored.
- Requests that pass screening are stored as ordinary requests and become visible under existing Needs Board rules.
- A pending privacy review stores the screened safe wording, categories, and workflow fields. It does not store the original flagged wording. The queue is admin-only; submitters can read their own review history.
- Approval screens the exact safe draft again. Screening or API failure fails closed and does not publish.
- Screening logs contain only a result category and an error code. The application does not log submitted text, model output, or API error messages.

## Detection limits

This is a local pattern and context screen, not a complete PII detector or a guarantee that text is anonymous. It can miss names without an explicit name cue, unfamiliar government-ID formats, indirect identifiers, slang, obfuscated strings, and contextual details outside its landmark patterns. Language and formatting variation can also produce false negatives. It can flag harmless text that resembles an identifier. The external classifier still receives content that passed the local checks; a local false negative can therefore reach Anthropic and, if the classifier also misses it, be stored as a normal request. People should continue to avoid names, contact details, health details, and exact locations.

No self-hosted NER/PII model or local PII package currently exists in the project dependencies. The implementation uses in-process rules and adds no paid external screening service. Changes to the local rules should be covered by `npm run test:privacy-screening-boundary`; the database-backed moderation tests require a verified development database and must not be run against production.
