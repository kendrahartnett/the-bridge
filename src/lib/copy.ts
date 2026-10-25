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

// AI assistant: every string the chat route and chat panel show people, in one place so the
// Spanish toggle can translate them all.
export const ASSISTANT_COPY = {
  errors: {
    tooLong: "That message is too long. Please keep it under 500 characters.",
    empty: "Please type a question first.",
    sessionLimit:
      "You've reached the limit of 10 questions for this chat. Refresh the page to start a new one.",
    rateLimited:
      "You've sent a lot of questions in the last hour. Please wait a bit and try again.",
    invalid: "Something went wrong with that message. Please try again.",
  },
  // The chat panel. {n} placeholders are filled in by the panel.
  panel: {
    openLabel: "Ask The Bridge assistant",
    closeLabel: "Close the assistant",
    title: "The Bridge assistant",
    notice: "You're chatting with an AI assistant. Don't share personal details.",
    crisis: "In crisis? Call or text 988.",
    starters: [
      "What is The Bridge?",
      "How do I post a need?",
      "How do organizations offer support?",
    ],
    inputLabel: "Your question",
    placeholder: "Ask a question about The Bridge",
    send: "Send",
    thinking: "Thinking…",
    you: "You",
    assistant: "Assistant",
    charactersLeft: "{n} characters left",
    questionsLeft: "{n} of 10 questions left",
    networkError: "We couldn't reach the assistant. Check your connection and try again.",
  },
  // Used when the AI service is unavailable, slow (15s), or declines to answer.
  fallback:
    "Sorry, I can't answer right now. The \"How it works\" section on the home page explains how The Bridge works, step by step. If you need help today with something The Bridge doesn't cover yet, you can call or text 211.",
} as const

// Sign-in and sign-up errors, in plain language. The technical reason is logged on the server.
export const AUTH_ERRORS = {
  wrongPassword: "That email and password don't match. Please try again.",
  signInUnavailable: "We couldn't sign you in right now. Please try again in a moment.",
  accountExists: "An account with that email already exists. Use the Sign in tab instead.",
  noAppAccount:
    "We found your login but not your account details. Please create your account again, or contact us if this keeps happening.",
  weakPassword: "Choose a stronger password with at least 8 characters.",
  tooManyAttempts: "Too many attempts. Please wait a few minutes and try again.",
  signUpUnavailable: "We couldn't create your account right now. Please try again in a moment.",
} as const

// Sign-in and create-account forms.
export const AUTH_COPY = {
  heading: "Welcome to The Bridge",
  intro: "Sign in or create an account. It takes about a minute.",
  tabs: { signIn: "Sign in", create: "Create account" },
  accountTypeLabel: "What kind of account?",
  accountTypes: {
    poster: {
      label: "I'm posting needs",
      help: "Outreach workers and community members",
    },
    organization: {
      label: "I'm an organization",
      help: "Groups that offer food, clothing, and supplies",
    },
  },
  fields: {
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    yourName: "Your name",
    team: "Organization or outreach team (optional)",
    organizationName: "Organization name",
    website: "Website",
    websitePlaceholder: "https://",
    ein: "EIN (optional)",
    einPlaceholder: "12-3456789",
    einHelp: "Nonprofits: your EIN helps us verify you faster.",
    contactName: "Contact name",
  },
  passwordHelp: "At least 8 characters.",
  posterPledge:
    "I'll describe what's needed, not the people. I won't share names, health details, or exact locations.",
  organizationPledge:
    "I confirm I'm authorized to represent this organization, and we'll use contact information only to coordinate support.",
  organizationReview:
    "Organization accounts are reviewed by a person before they can claim needs or see contact information. This usually takes one business day.",
  submitSignIn: "Sign in",
  submitCreate: "Create my account",
  pending: "One moment…",
} as const

// What organizations see while their account is reviewed, or after it's declined.
// {email} is replaced with ADMIN_CONTACT_EMAIL.
export const VERIFICATION_COPY = {
  pendingBanner:
    "Your organization is under review. You can browse the Needs Board, but you can't claim needs or see contact information until you're approved.",
  rejectedBanner: "Your organization wasn't approved. If you think this is a mistake, contact {email}.",
  rejectedBannerNoEmail: "Your organization wasn't approved.",
  availableAfterApproval: "Available after approval.",
  yourPost: "Your post",
} as const

// Header navigation for signed-in people.
export const NAV_COPY = {
  label: "Main",
  menu: "Menu",
  dashboard: "Dashboard",
  admin: "Admin",
} as const

// Admin review page. {org} is replaced with the organization's name.
export const ADMIN_COPY = {
  backToDashboard: "← Back to dashboard",
  title: "Organization review",
  intro: "Organizations can claim needs and see contact information only after a person approves them here.",
  tabs: { pending: "Pending", approved: "Approved", rejected: "Rejected" },
  empty: {
    pending: "No organizations are waiting for review.",
    approved: "No approved organizations yet.",
    rejected: "No rejected organizations.",
  },
  fields: {
    website: "Website",
    ein: "EIN",
    contact: "Contact",
    email: "Email",
    applied: "Applied",
    reviewedBy: "Reviewed by",
    reviewed: "Reviewed",
    note: "Internal note",
  },
  irsLink: "Look up in IRS Tax Exempt Organization Search",
  checklistTitle: "Before you approve, check:",
  checklist: [
    "Website matches the organization name",
    "EIN found in IRS search (if provided)",
    "Contact email domain matches the website (if possible)",
  ],
  approve: "Approve",
  reject: "Reject",
  revoke: "Revoke approval",
  notNow: "Not now",
  confirmApprove: "Approve {org}? They'll be able to claim needs and see contact information.",
  confirmReject: "Reject {org}? They'll see that they weren't approved and won't be able to claim needs.",
  confirmRevoke:
    "Revoke approval for {org}? They won't be able to claim needs or see contact information, and their open posts will be hidden.",
  yesApprove: "Yes, approve",
  yesReject: "Yes, reject",
  yesRevoke: "Yes, revoke",
  noteLabel: "Internal note (optional, only admins see it)",
  noteCount: "{n}/300",
} as const

// Contact line on request cards, shown only to the poster and the supporting organization
// once a request is In Progress or Fulfilled.
export const CONTACT_COPY = {
  supportedBy: "Supported by",
  postedBy: "Posted by",
  emailLabel: "Email",
  note: "Use this to arrange the handoff. Don't share names or details of the people being served.",
} as const

// The Spanish terms the assistant must use for app labels (English → Spanish). Also the
// starting point for the Spanish toggle.
export const SPANISH_GLOSSARY = [
  ["Post a Need", "Publicar una necesidad"],
  ["Offer Support", "Ofrecer apoyo"],
  ["Open", "Abierta"],
  ["In Progress", "En curso"],
  ["Fulfilled", "Completada"],
  ["Cancelled", "Cancelada"],
  ["Outreach worker", "Trabajador de alcance comunitario"],
  ["Organization", "Organización"],
  ["Food", "Comida"],
  ["Clothing", "Ropa"],
  ["Hygiene supplies", "Artículos de higiene"],
  ["Other", "Otro"],
  ["Neighborhood", "Barrio"],
  ["Dashboard", "Panel"],
] as const

// Full mission, shown in the landing page "Mission Statement" section. Verbatim; do not edit
// without sign-off. (The Day 1 "mission appears verbatim" check now applies to this file.)
export const MISSION =
  "Bridging the gap between people experiencing homelessness and the community organizations ready to help. We start with essential resources and outreach, build trust through consistent contact, and grow into the services people need to find stability: medical care, documents, benefits, addiction and mental health support, employment, education, and housing."
