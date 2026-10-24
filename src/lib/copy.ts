// Landing page hero copy. Verbatim; do not edit without sign-off.
export const HERO_BADGE = "Rooted in Chicago · Built for change" // shown uppercase via CSS

export const HERO_HEADLINE = ["Bridging the Gap.", "Every Connection is a Step Forward."] as const

export const HERO_LINE =
  "The Bridge closes the gap between community needs and available resources by bringing together individuals, outreach teams, and organizations committed to helping others."

// The two ways to use The Bridge. Shared by the landing page buttons and the sign-in
// role options so the wording always matches.
export const ROLE_CTAS = {
  outreach: { label: "Post a Need", help: "Request support for someone you're working with." },
  donor: { label: "Offer Support", help: "Respond with food, clothing, hygiene supplies, and more." },
} as const

// "What is The Bridge?" section. Verbatim; do not edit without sign-off.
export const WHAT_IS_HEADING = "What is The Bridge?"

export const WHAT_IS_PARAGRAPHS = [
  "The Bridge is a Chicago-based community platform that connects outreach workers with local organizations and community members who want to help people experiencing homelessness.",
  "Outreach workers can post requests for essential resources, including food, clothing, hygiene supplies, and other basic necessities. Community organizations can view these requests, identify where help is needed, and respond with available resources.",
  "But The Bridge is about more than meeting immediate needs. It's about building connections, strengthening community partnerships, and creating pathways to long-term stability. When outreach workers and organizations work together, they can build trust, provide consistent support, and help connect people to additional services like healthcare, identification assistance, housing, and other resources.",
  "Privacy and dignity are central to The Bridge. The platform does not require identifying information about the individuals receiving assistance. Requests focus on what is needed and the general neighborhood, without exposing names, exact locations, or personal circumstances.",
] as const

// Full mission, shown in the landing page "Mission Statement" section. Verbatim; do not edit
// without sign-off. (The Day 1 "mission appears verbatim" check now applies to this file.)
export const MISSION =
  "Bridging the gap between people experiencing homelessness and the community organizations ready to help. We start with essential resources and outreach, build trust through consistent contact, and grow into the services people need to find stability: medical care, documents, benefits, addiction and mental health support, employment, education, and housing."
