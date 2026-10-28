// Every string people see, in English and Spanish. Each value in `en` has a matching
// value in `es` (the Spanish dictionary is typed against the English one, so a missing
// string fails the build).
//
// Pages and components get their language's copy with copyFor(lang): Server Components
// call getCopy() (src/lib/i18n-server.ts), Client Components useCopy() (the language
// provider). The English names below (HERO_BADGE, BOARD_COPY, …) stay exported for the
// assistant prompt, the request rules and the tests.
//
// Kept in English on purpose: The Bridge (the name), what people type (items, notes,
// names), neighborhood and organization names, and the text inside the homepage artwork.
//
// "needs review" marks a Spanish string that is a judgment call (legal-sounding,
// safety-related, or approved verbatim English copy) for a fluent reviewer to check.
// Spanish uses "usted" throughout.

import type { Lang } from "./i18n.ts"

const en = {
  // Browser tab titles and the site description.
  META: {
    siteTitle: "The Bridge",
    siteDescription:
      "Connecting Chicago outreach teams with organizations and neighbors ready to help, so people experiencing homelessness get essential resources and a path to more support.",
    dashboard: "Dashboard · The Bridge",
    board: "Needs Board · The Bridge",
    need: "Need · The Bridge",
    postNeed: "Post a Need · The Bridge",
    admin: "Admin · The Bridge",
    signIn: "Sign in · The Bridge",
  },

  // Landing page hero copy. Verbatim; do not edit without sign-off.
  HERO_BADGE: "Rooted in Chicago · Built for change", // shown uppercase via CSS
  HERO_HEADLINE: ["Bridging the Gap.", "Every Connection is a Step Forward."],
  // Supporting copy under the headline (approved with the Phase 2 homepage design).
  HERO_LEAD: "Real needs. Real people. Real connections.",
  HERO_DESCRIPTION:
    "The Bridge brings individuals, outreach teams, and organizations together to turn community needs into meaningful action.",
  // The "Bridging the Gap." artwork (public/images/hero-landing-image.png in light mode,
  // hero-light-mode.png in dark mode), between How it works and What is The Bridge?. The
  // words in the artwork itself stay English; the alt text is translated.
  HERO_IMAGE: { alt: "Bridging the Gap." },
  // The hero illustration (public/images/new-bridge.png).
  BRIDGE_IMAGE: {
    alt: "Illustration of two people crossing a golden bridge over the Chicago River, with the city skyline behind them.",
  },
  // The two ways to use The Bridge: the homepage buttons, the dashboard's Post a Need
  // button, and the Post a Need page title, so the wording always matches.
  ROLE_CTAS: { outreach: { label: "Post a Need" }, donor: { label: "Offer Support" } },
  // The homepage's two buttons (shown in capitals, with an arrow).
  HOME_CTAS: { outreach: "Post a need", donor: "Offer support" },

  // "How it works" section. Verbatim; do not edit without sign-off.
  HOW_IT_WORKS_HEADING: "How it works",
  JOURNEY: [
    { label: "Request", description: "Anyone in the community can share a need." },
    { label: "Connect", description: "People and organizations come together to help." },
    { label: "Provide", description: "Help, resources, and information reach those who need them." },
    { label: "Support", description: "Ongoing connections create pathways to housing and essential services." },
    { label: "Transform", description: "Communities work together toward ending homelessness." },
  ],

  COMMUNITY_IMPACT_COPY: {
    homeHeading: "Every connection makes a difference.",
    description: "See the support happening through The Bridge, one fulfilled need at a time.",
    dashboardHeading: "Community Impact",
    estimatedPeopleReached: "Estimated People Reached",
    needsFulfilled: "Needs Fulfilled",
    openRequests: "Open Requests",
    explanation: "Estimated reach is based on the number of people listed in fulfilled requests. Individuals may be counted more than once.",
    loading: "Loading community impact…",
    unavailable: "Community impact totals are temporarily unavailable.",
  },

  // "What is The Bridge?" section. Verbatim; do not edit without sign-off.
  WHAT_IS_HEADING: "What is The Bridge?",
  WHAT_IS_PARAGRAPHS: [
    "The Bridge is a Chicago-based community platform that connects outreach workers with local organizations and community members who want to help people experiencing homelessness.",
    "Outreach workers can post requests for essential resources, including food, clothing, hygiene supplies, and other basic necessities. Community organizations can view these requests, identify where help is needed, and respond with available resources.",
    "But The Bridge is about more than meeting immediate needs. It's about building connections, strengthening community partnerships, and creating pathways to long-term stability. When outreach workers and organizations work together, they can build trust, provide consistent support, and help connect people to additional services like healthcare, identification assistance, housing, and other resources.",
    "Privacy and dignity are central to The Bridge. The platform does not require identifying information about the individuals receiving assistance. Requests focus on what is needed and the general neighborhood, without exposing names, exact locations, or personal circumstances.",
  ],

  MISSION_HEADING: "Mission Statement",
  // Full mission, shown in the landing page "Mission Statement" section. Verbatim; do not
  // edit without sign-off.
  MISSION:
    "Bridging the gap between people experiencing homelessness and the community organizations ready to help. We start with essential resources and outreach, build trust through consistent contact, and grow into the services people need to find stability: medical care, documents, benefits, addiction and mental health support, employment, education, and housing.",
  FOOTER_TEXT: "The Bridge · Chicago",

  // The header, theme switch and language switch.
  UI: {
    homeLabel: "The Bridge, home",
    dashboardHomeLabel: "The Bridge, dashboard",
    signIn: "Sign in",
    signOut: "Sign out",
    themeToDark: "Switch to dark mode",
    themeToLight: "Switch to light mode",
    language: "Language",
    english: "English",
    spanish: "Español",
    // The language switch's tooltip (the same in both languages).
    langTooltip: "English / Español",
  },

  // Display labels for database values. The stored values never change.
  LABELS: {
    role: { outreach: "Outreach worker or community member", donor: "Organization" },
    status: { open: "Open", claimed: "In Progress", delivered: "Fulfilled", cancelled: "Cancelled" },
    category: { food: "Food", clothing: "Clothing", hygiene: "Hygiene supplies", other: "Other" },
  },

  // AI assistant: every string the chat route and chat panel show people.
  ASSISTANT_COPY: {
    errors: {
      tooLong: "That message is too long. Please keep it under 500 characters.",
      empty: "Please type a question first.",
      sessionLimit: "You've reached the limit of 10 questions for this chat. Refresh the page to start a new one.",
      rateLimited: "You've sent a lot of questions in the last hour. Please wait a bit and try again.",
      invalid: "Something went wrong with that message. Please try again.",
    },
    // The chat panel. {n} placeholders are filled in by the panel.
    panel: {
      // The chat button's name, and its tooltip on hover and keyboard focus (the same text).
      openLabel: "Ask The Bridge assistant",
      // A one-time hint beside the chat button on phones.
      phoneHint: "Ask a question",
      closeLabel: "Close the assistant",
      title: "The Bridge assistant",
      notice: "You're chatting with an AI assistant. Don't share personal details.",
      crisis: "In crisis? Call or text 988.",
      starters: ["What is The Bridge?", "How do I post a need?", "Can you help me look for housing resources?"],
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
      'Sorry, I can\'t answer right now. The "How it works" section on the home page explains how The Bridge works. For local services that need verification, you can call or text 211.',
  },

  // Sign-in and sign-up errors, in plain language. The technical reason is logged on the server.
  AUTH_ERRORS: {
    wrongPassword: "That email and password don't match. Please try again.",
    signInUnavailable: "We couldn't sign you in right now. Please try again in a moment.",
    accountExists: "An account with that email already exists. Use the Sign in tab instead.",
    noAppAccount:
      "We found your login but not your account details. Please create your account again, or contact us if this keeps happening.",
    weakPassword: "Choose a stronger password with at least 8 characters.",
    tooManyAttempts: "Too many sign-in attempts. Please wait a minute and try again.",
    signUpUnavailable: "We couldn't create your account right now. Please try again in a moment.",
    signInAgain: "Please sign in again.",
  },

  // Sign-in and create-account forms.
  AUTH_COPY: {
    backHome: "← Back to home",
    heading: "Welcome to The Bridge",
    intro: "Sign in or create an account. It takes about a minute.",
    tabs: { signIn: "Sign in", create: "Create account" },
    accountTypeLabel: "What kind of account?",
    accountTypes: {
      poster: { label: "I'm posting needs", help: "Outreach workers and community members" },
      organization: { label: "I'm an organization", help: "Groups that offer food, clothing, and supplies" },
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
    showPassword: "Show password",
    hidePassword: "Hide password",
    posterPledge:
      "I'll describe what's needed, not the people. I won't share names, health details, or exact locations.",
    organizationPledge:
      "I confirm I'm authorized to represent this organization, and we'll use contact information only to coordinate support.",
    organizationReview:
      "Organization accounts are reviewed by a person before they can claim needs or see contact information. This usually takes one business day.",
    submitSignIn: "Sign In",
    submitCreate: "Create my account",
    pending: "One moment…",
  },

  // What organizations see while their account is reviewed, or after it's declined.
  // {email} is replaced with ADMIN_CONTACT_EMAIL.
  VERIFICATION_COPY: {
    pendingBanner:
      "Your organization is under review. You can browse the Needs Board, but you can't claim needs or see contact information until you're approved.",
    // Added after the pending banner when ADMIN_CONTACT_EMAIL is set.
    pendingQuestions: "Questions? Contact {email}.",
    rejectedBanner: "Your organization wasn't approved. If you think this is a mistake, contact {email}.",
    rejectedBannerNoEmail: "Your organization wasn't approved.",
    availableAfterApproval: "Available after approval.",
    yourPost: "Your post",
  },

  // Dashboard. {name} is replaced with the person's name.
  DASHBOARD_COPY: {
    loading: "Loading your dashboard…",
    greeting: "Hi, {name}",
    outreach: {
      statsLabel: "Your impact",
      peopleHelped: "People helped through your requests",
      fulfilled: "Requests fulfilled",
      waiting: "Requests waiting for support",
      peopleWaiting: "People represented by your open requests",
      heading: "Your requests",
      empty: "You haven't posted a need yet. Start a request and organizations nearby will see it.",
    },
    organization: {
      statsLabel: "Right now",
      openCount: "Open requests",
      peopleWaiting: "People represented by open requests",
      latestHeading: "Latest needs",
      latestIntro: "The newest needs on the Needs Board. Open one to see the details and claim it.",
      viewBoard: "View the Needs Board",
      supportingHeading: "Needs you're supporting",
      supportingThis: "You're supporting this",
      postsHeading: "Your posts",
      postsEmpty: "You haven't posted a need yet. Use Post a Need to ask for support from other organizations.",
      accountStatusLabel: "Account status",
    },
    quickActions: { heading: "Quick actions", post: "Post a Need", board: "View Needs Board", requests: "View My Requests", inbox: "View Inbox" },
    inboxReminder: { heading: "You have updates waiting", description: "View your inbox to see the latest activity." },
  },

  // The Post a Need page around the form. The privacy notice is exact wording; do not edit
  // without sign-off. No database fields back it.
  NEW_REQUEST_COPY: {
    back: "← Back to dashboard",
    title: "Post a need",
    intro:
      "Tell organizations what's needed, for how many people, and when. Only the neighborhood is shared. Please don't include names, addresses, or camp locations.",
    privacyLabel: "Privacy",
    privacy:
      "The Bridge stores the resource need, community area, time window, and privacy screening status. Requests awaiting review keep only a separately screened safe draft and category labels, not the original flagged wording. Items, notes, and community area are sent to Anthropic for screening. Please don't share names, addresses, or exact locations.",
    loading: "Loading…",
  },

  // The Post a Need form fields, in two sections.
  NEW_REQUEST_FORM: {
    sections: { what: "What's needed", whereWhen: "Where and when" },
    peopleCount: "How many people?",
    category: "Type of support",
    categoryPlaceholder: "Choose a type",
    items: "What's needed",
    itemsPlaceholder: "Example: 10 winter coats, sizes M–XL",
    itemsHelp: "Describe the items needed, not the people. Don't include names, health details, or exact locations.",
    notes: "Notes (optional)",
    notesPlaceholder: "Example: sizes, dietary needs, or quantities per person",
    // {n} is the number of characters typed.
    notesHelp: "{n}/300. No names or other personal details.",
    neighborhood: "Neighborhood",
    neighborhoodPlaceholder: "Choose a neighborhood",
    window: "When can you receive it? (Chicago time)",
    windowStart: "From",
    windowEnd: "Until",
    submit: "Send request",
    pending: "Sending…",
  },

  // Request cards and the request detail layout.
  REQUEST_COPY: {
    person: "person",
    people: "people",
    peopleLabel: "People",
    where: "Where",
    when: "When",
    notes: "Notes",
    // "10 winter coats for 40 people": the request's title everywhere it appears.
    title: "{items} for {people}",
  },

  // The actions on a request card. Each asks once before it runs.
  REQUEST_ACTIONS: {
    claim: {
      label: "Claim this need",
      question: "Claim this need? You'll see the poster's contact info so you can arrange the handoff.",
      confirm: "Yes, claim it",
    },
    deliver: {
      label: "Mark fulfilled",
      question: "Did the items arrive? This marks the request as fulfilled.",
      confirm: "Yes, mark fulfilled",
    },
    cancel: {
      label: "Cancel",
      question: "Cancel this request? Organizations will no longer see it.",
      confirm: "Yes, cancel it",
    },
    notNow: "Not now",
    pending: "One moment…",
  },

  // The Needs Board (/board) and its sticky notes.
  BOARD_COPY: {
    title: "Needs Board",
    intro: "Open needs come first, then needs another organization has claimed. Open a note to see the details and claim it.",
    loading: "Loading the Needs Board…",
    empty: "No open needs right now. Check back soon.",
    // The stamp on an In Progress note, and the label on an organization's own post.
    stamp: "Claimed",
    yourPost: "Your post",
    // Read by screen readers on each note (the stamp is decorative).
    status: "Status:",
  },

  // A need's own page (/requests/[id]).
  DETAIL_COPY: {
    backToBoard: "← Back to the Needs Board",
    backToDashboard: "← Back to dashboard",
    loading: "Loading…",
    posted: "Posted",
    timelineHeading: "Status",
    timeline: { posted: "Posted", claimed: "Claimed", fulfilled: "Fulfilled", cancelled: "Cancelled" },
    notYet: "Not yet",
    timeNotRecorded: "Time not recorded",
    contactAfterClaim: "Contact info appears after you claim.",
    claimedByOther: "Claimed by another organization.",
    youClaimed: "Your organization claimed this need.",
  },

  // The dedicated inbox and navigation indicator. Messages are built when shown,
  // from the need and the people involved: {org}, {items}, {poster}, {email}.
  INBOX_COPY: {
    heading: "Inbox",
    intro: "Updates about your requests, connections, and account.",
    loading: "Loading your inbox…",
    markAllRead: "Mark all as read",
    empty: "You're all caught up. When there's an update about your requests or connections, you'll see it here.",
    unread: "Unread",
    titles: { need_claimed: "Need claimed", need_fulfilled: "Need fulfilled", org_approved: "Organization approved", org_rejected: "Organization not approved", privacy_pending: "Privacy review pending", privacy_approved: "Privacy review approved", privacy_changes: "Changes requested", privacy_rejected: "Privacy review not approved", privacy_new_review: "New privacy review" },
    messages: {
      needClaimed: "{org} claimed your need: {items}",
      needFulfilled: "{poster} marked a need you supported as fulfilled.",
      orgApproved: "Your organization was approved. You can now claim needs and post needs.",
      orgRejected: "Your organization wasn't approved. Contact {email} with questions.",
      orgRejectedNoEmail: "Your organization wasn't approved.",
      privacyPending: "Your request is awaiting privacy review. It is not on the Needs Board yet.",
      privacyApproved: "Your request passed privacy review and is now on the Needs Board.",
      privacyChanges: "Changes were requested for your need. Open your dashboard to revise it.",
      privacyRejected: "Your request was not approved for posting. Open your dashboard for its status.",
      privacyNewReview: "A new need is waiting for privacy review.",
    },
    // Who to name when a name isn't on record.
    someOrganization: "An organization",
    someone: "The person who posted it",
    // The bell's name for screen readers: "Inbox, 3 unread" or "Inbox, no unread".
    bellLabel: "Inbox, {n} unread",
    bellLabelNone: "Inbox, no unread",
    // In the phone menu below 360px, where the bell moves.
    menuItem: "Inbox",
  },

  // The 404 page. Exactly the same for a page that doesn't exist and one the visitor isn't
  // allowed to see (it never reads the session), so it reveals nothing about either.
  NOT_FOUND_COPY: {
    title: "Page not found",
    home: "Back to homepage",
    imageAlt: "404. Illustration of two people crossing a golden bridge in front of the Chicago skyline.",
  },

  // Header navigation for signed-in people.
  NAV_COPY: { label: "Main", menu: "Menu", dashboard: "Dashboard", board: "Needs Board", admin: "Admin" },

  // Admin review page. {org} is replaced with the organization's name.
  ADMIN_COPY: {
    backToDashboard: "← Back to dashboard",
    loading: "Loading…",
    tabsLabel: "Review status",
    verificationLabel: "Verification",
    opensInNewTab: "(opens in a new tab)",
    notRecorded: "—",
    pending: "One moment…",
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
  },

  // Contact line on request cards, shown only to the poster and the supporting organization
  // once a request is In Progress or Fulfilled.
  CONTACT_COPY: {
    supportedBy: "Supported by",
    postedBy: "Posted by",
    emailLabel: "Email",
    note: "Use this to arrange the handoff. Don't share names or details of the people being served.",
  },
  PRIVACY_COPY: {
    disclosure: "To protect privacy, request details are checked using Anthropic AI before posting. Avoid sharing names, exact addresses, or identifying details.",
    checking: "Checking your request for privacy…",
    unavailable: "Privacy screening is temporarily unavailable. Your request has not been posted. Please try again.",
    flaggedTitle: "Privacy check — please review your request",
    flaggedIntro: "Your request may contain details that could identify someone or reveal an exact location. Please edit and try again.",
    appliedIntro: "Suggested wording was added to Notes. Check What's needed and any other text for sensitive details, then submit again for a new privacy check.",
    suggested: "Safer example wording",
    category: {
      exact_address: "This looks like a street address or building number.",
      unit_identifier: "This looks like a unit, room, or floor number.",
      precise_location: "This looks like a precise location or map pin.",
      vulnerable_person_identification: "This may identify a person or where they stay.",
    },
    edit: "Edit your request",
    applySuggestion: "Use this wording",
    reviewQueued: "Your request is awaiting privacy review. It is not publicly visible.",
    reviewHeading: "Privacy review",
    backToAdmin: "← Back to admin",
    reviewEmptyTitle: "All caught up",
    reviewEmpty: "There are no requests waiting for privacy review.",
    reviewIntro: "Only the screened safe version is shown here. Review it before publication.",
    pendingCount: "{n} pending",
    requestInfo: "Safe request version",
    screeningInfo: "Privacy screening results",
    created: "Submitted",
    risk: "Risk level",
    categories: "Detected categories",
    status: "Status",
    statusLabels: { pending_review: "Pending privacy review", changes_requested: "Changes requested", approved: "Approved", rejected: "Rejected", superseded: "Revised and resubmitted" },
    medium: "Needs human review",
    approve: "Approve safe version",
    changes: "Request changes",
    reject: "Reject request",
    reasonLabel: "Reason",
    reasonPrompt: "Choose a reason",
    reasons: { privacy_detail: "Remove details that could identify a person or location.", insufficient_detail: "Clarify the resource need without personal details.", outside_scope: "This request is outside the resources The Bridge currently supports." },
    decisionError: "We couldn't complete this review. Please try again.",
    myHeading: "Requests under privacy review",
    revise: "Revise safe draft",
    poweredBy: "Powered By",
    provider: "Haiku 5.5",
    providerLabel: "Powered by Anthropic, Haiku 5.5 (opens in a new tab)",
  },
}

/** Every string widened (so the Spanish dictionary can hold different words). */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { readonly [K in keyof T]: Widen<T[K]> }

export type Copy = Widen<typeof en>

const es: Copy = {
  META: {
    siteTitle: "The Bridge",
    siteDescription:
      "Conectamos a los equipos de alcance comunitario de Chicago con organizaciones y vecinos dispuestos a ayudar, para que las personas sin hogar reciban recursos esenciales y un camino hacia más apoyo.",
    dashboard: "Panel · The Bridge",
    board: "Tablero de necesidades · The Bridge",
    need: "Necesidad · The Bridge",
    postNeed: "Publicar una necesidad · The Bridge",
    admin: "Administración · The Bridge",
    signIn: "Iniciar sesión · The Bridge",
  },

  // needs review: approved verbatim English copy (homepage hero). Kept to the English
  // length (36 characters) so it stays on one line at 320px, like the English.
  HERO_BADGE: "Arraigado en Chicago · Por el cambio",
  // needs review: approved verbatim English copy. [0] isn't shown (it's in the artwork).
  HERO_HEADLINE: ["Cerrando la brecha.", "Cada conexión es un paso adelante."],
  // needs review: approved homepage copy.
  HERO_LEAD: "Necesidades reales. Personas reales. Conexiones reales.",
  // needs review: approved homepage copy.
  HERO_DESCRIPTION:
    "The Bridge reúne a personas, equipos de alcance comunitario y organizaciones para convertir las necesidades de la comunidad en acciones concretas.",
  // needs review: the artwork's words stay English; this alt text gives them in Spanish.
  HERO_IMAGE: { alt: "Cerrando la brecha." },
  BRIDGE_IMAGE: {
    alt: "Ilustración de dos personas cruzando un puente dorado sobre el río Chicago, con el horizonte de la ciudad detrás.",
  },
  ROLE_CTAS: { outreach: { label: "Publicar una necesidad" }, donor: { label: "Ofrecer apoyo" } },
  HOME_CTAS: { outreach: "Publicar una necesidad", donor: "Ofrecer apoyo" },

  // needs review: approved verbatim English copy ("How it works").
  HOW_IT_WORKS_HEADING: "Cómo funciona",
  JOURNEY: [
    { label: "Solicitar", description: "Cualquier persona de la comunidad puede compartir una necesidad." },
    { label: "Conectar", description: "Personas y organizaciones se unen para ayudar." },
    { label: "Brindar", description: "La ayuda, los recursos y la información llegan a quienes los necesitan." },
    { label: "Apoyar", description: "Las conexiones continuas abren caminos hacia la vivienda y los servicios esenciales." },
    { label: "Transformar", description: "Las comunidades trabajan juntas para poner fin a la falta de vivienda." },
  ],

  COMMUNITY_IMPACT_COPY: {
    homeHeading: "Cada conexión marca la diferencia.",
    description: "Vea el apoyo que se brinda a través de The Bridge, una necesidad completada a la vez.",
    dashboardHeading: "Impacto comunitario",
    estimatedPeopleReached: "Personas alcanzadas (estimado)",
    needsFulfilled: "Necesidades completadas",
    openRequests: "Solicitudes abiertas",
    explanation: "El alcance estimado se basa en la cantidad de personas indicada en las solicitudes completadas. Es posible que una misma persona se cuente más de una vez.",
    loading: "Cargando el impacto comunitario…",
    unavailable: "Los totales del impacto comunitario no están disponibles temporalmente.",
  },

  // needs review: approved verbatim English copy ("What is The Bridge?").
  WHAT_IS_HEADING: "¿Qué es The Bridge?",
  WHAT_IS_PARAGRAPHS: [
    "The Bridge es una plataforma comunitaria con sede en Chicago que conecta a trabajadores de alcance comunitario con organizaciones locales y miembros de la comunidad que quieren ayudar a las personas sin hogar.",
    "Los trabajadores de alcance comunitario pueden publicar solicitudes de recursos esenciales, como comida, ropa, artículos de higiene y otras necesidades básicas. Las organizaciones comunitarias pueden ver estas solicitudes, identificar dónde se necesita ayuda y responder con los recursos disponibles.",
    "Pero The Bridge es más que atender necesidades inmediatas. Se trata de crear conexiones, fortalecer las alianzas comunitarias y abrir caminos hacia una estabilidad a largo plazo. Cuando los trabajadores de alcance comunitario y las organizaciones trabajan juntos, pueden generar confianza, brindar un apoyo constante y ayudar a conectar a las personas con otros servicios, como atención médica, ayuda con documentos de identidad, vivienda y otros recursos.",
    "La privacidad y la dignidad son fundamentales para The Bridge. La plataforma no exige información que identifique a las personas que reciben ayuda. Las solicitudes se centran en lo que se necesita y en el barrio en general, sin revelar nombres, ubicaciones exactas ni circunstancias personales.",
  ],

  MISSION_HEADING: "Nuestra misión",
  // needs review: approved verbatim English mission.
  MISSION:
    "Cerrar la brecha entre las personas sin hogar y las organizaciones comunitarias dispuestas a ayudar. Empezamos con recursos esenciales y alcance comunitario, generamos confianza mediante un contacto constante y crecemos hacia los servicios que las personas necesitan para encontrar estabilidad: atención médica, documentos, beneficios, apoyo para adicciones y salud mental, empleo, educación y vivienda.",
  FOOTER_TEXT: "The Bridge · Chicago",

  UI: {
    homeLabel: "The Bridge, inicio",
    dashboardHomeLabel: "The Bridge, panel",
    // needs review: the short forms, so the header fits on one row (the sign-in page itself
    // says "Iniciar sesión").
    signIn: "Entrar",
    signOut: "Salir",
    themeToDark: "Cambiar a modo oscuro",
    themeToLight: "Cambiar a modo claro",
    language: "Idioma",
    english: "English",
    spanish: "Español",
    langTooltip: "English / Español",
  },

  LABELS: {
    role: { outreach: "Trabajador de alcance comunitario o miembro de la comunidad", donor: "Organización" },
    status: { open: "Abierta", claimed: "En curso", delivered: "Completada", cancelled: "Cancelada" },
    category: { food: "Comida", clothing: "Ropa", hygiene: "Artículos de higiene", other: "Otro" },
  },

  ASSISTANT_COPY: {
    errors: {
      tooLong: "Ese mensaje es demasiado largo. Use menos de 500 caracteres.",
      empty: "Primero escriba una pregunta.",
      sessionLimit: "Llegó al límite de 10 preguntas en este chat. Actualice la página para empezar uno nuevo.",
      rateLimited: "Envió muchas preguntas en la última hora. Espere un poco y vuelva a intentarlo.",
      invalid: "Algo salió mal con ese mensaje. Vuelva a intentarlo.",
    },
    panel: {
      openLabel: "Preguntar al asistente de The Bridge",
      phoneHint: "Haga una pregunta",
      closeLabel: "Cerrar el asistente",
      title: "Asistente de The Bridge",
      // needs review: AI disclosure and privacy warning.
      notice: "Está hablando con un asistente de IA. No comparta datos personales.",
      // needs review: crisis line (safety).
      crisis: "¿En crisis? Llame o envíe un mensaje de texto al 988.",
      starters: ["¿Qué es The Bridge?", "¿Cómo publico una necesidad?", "¿Cómo busco recursos de vivienda?"],
      inputLabel: "Su pregunta",
      placeholder: "Haga una pregunta sobre The Bridge",
      send: "Enviar",
      thinking: "Pensando…",
      you: "Usted",
      assistant: "Asistente",
      charactersLeft: "Quedan {n} caracteres",
      questionsLeft: "Quedan {n} de 10 preguntas",
      networkError: "No pudimos comunicarnos con el asistente. Revise su conexión y vuelva a intentarlo.",
    },
    // needs review: points people to 211 (safety).
    fallback:
      "Lo siento, no puedo responder en este momento. La sección «Cómo funciona» de la página de inicio explica cómo funciona The Bridge. Para encontrar servicios locales que necesitan verificación, puede llamar o enviar un mensaje de texto al 211.",
  },

  AUTH_ERRORS: {
    wrongPassword: "Ese correo electrónico y esa contraseña no coinciden. Vuelva a intentarlo.",
    signInUnavailable: "No pudimos iniciar su sesión en este momento. Vuelva a intentarlo en un momento.",
    accountExists: "Ya existe una cuenta con ese correo electrónico. Use la pestaña Iniciar sesión.",
    noAppAccount:
      "Encontramos su inicio de sesión, pero no los datos de su cuenta. Vuelva a crear su cuenta o comuníquese con nosotros si esto sigue pasando.",
    weakPassword: "Elija una contraseña más segura, de al menos 8 caracteres.",
    tooManyAttempts: "Demasiados intentos de inicio de sesión. Espere un minuto y vuelva a intentarlo.",
    signUpUnavailable: "No pudimos crear su cuenta en este momento. Vuelva a intentarlo en un momento.",
    signInAgain: "Vuelva a iniciar sesión.",
  },

  AUTH_COPY: {
    backHome: "← Volver al inicio",
    heading: "Bienvenido a The Bridge",
    intro: "Inicie sesión o cree una cuenta. Toma alrededor de un minuto.",
    tabs: { signIn: "Iniciar sesión", create: "Crear cuenta" },
    accountTypeLabel: "¿Qué tipo de cuenta?",
    accountTypes: {
      poster: { label: "Publico necesidades", help: "Trabajadores de alcance comunitario y miembros de la comunidad" },
      organization: { label: "Soy una organización", help: "Grupos que ofrecen comida, ropa y artículos" },
    },
    fields: {
      email: "Correo electrónico",
      password: "Contraseña",
      confirmPassword: "Confirmar contraseña",
      yourName: "Su nombre",
      team: "Organización o equipo de alcance comunitario (opcional)",
      organizationName: "Nombre de la organización",
      website: "Sitio web",
      websitePlaceholder: "https://",
      ein: "EIN (opcional)",
      einPlaceholder: "12-3456789",
      einHelp: "Organizaciones sin fines de lucro: su EIN nos ayuda a verificarlas más rápido.",
      contactName: "Nombre de contacto",
    },
    passwordHelp: "Al menos 8 caracteres.",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
    // needs review: pledge (legal-sounding, privacy).
    posterPledge:
      "Describiré lo que se necesita, no a las personas. No compartiré nombres, datos de salud ni ubicaciones exactas.",
    // needs review: pledge (legal-sounding: authority to represent the organization).
    organizationPledge:
      "Confirmo que estoy autorizado para representar a esta organización y que usaremos la información de contacto solo para coordinar el apoyo.",
    organizationReview:
      "Una persona revisa las cuentas de organización antes de que puedan reclamar necesidades o ver información de contacto. Esto suele tardar un día hábil.",
    submitSignIn: "Iniciar sesión",
    submitCreate: "Crear mi cuenta",
    pending: "Un momento…",
  },

  VERIFICATION_COPY: {
    pendingBanner:
      "Su organización está en revisión. Puede ver el Tablero de necesidades, pero no puede reclamar necesidades ni ver información de contacto hasta que la aprueben.",
    pendingQuestions: "¿Preguntas? Escriba a {email}.",
    rejectedBanner: "Su organización no fue aprobada. Si cree que es un error, escriba a {email}.",
    rejectedBannerNoEmail: "Su organización no fue aprobada.",
    availableAfterApproval: "Disponible después de la aprobación.",
    yourPost: "Su publicación",
  },

  DASHBOARD_COPY: {
    loading: "Cargando su panel…",
    greeting: "Hola, {name}",
    outreach: {
      statsLabel: "Su impacto",
      peopleHelped: "Personas ayudadas con sus solicitudes",
      fulfilled: "Solicitudes completadas",
      waiting: "Solicitudes que esperan apoyo",
      peopleWaiting: "Personas incluidas en sus solicitudes abiertas",
      heading: "Sus solicitudes",
      empty: "Todavía no ha publicado ninguna necesidad. Cree una solicitud y las organizaciones cercanas la verán.",
    },
    organization: {
      statsLabel: "En este momento",
      openCount: "Solicitudes abiertas",
      peopleWaiting: "Personas incluidas en las solicitudes abiertas",
      latestHeading: "Necesidades recientes",
      latestIntro: "Las necesidades más nuevas del Tablero de necesidades. Abra una para ver los detalles y reclamarla.",
      viewBoard: "Ver el Tablero de necesidades",
      supportingHeading: "Necesidades que apoya",
      supportingThis: "Usted apoya esta necesidad",
      postsHeading: "Sus publicaciones",
      postsEmpty: "Todavía no ha publicado ninguna necesidad. Use Publicar una necesidad para pedir apoyo a otras organizaciones.",
      accountStatusLabel: "Estado de la cuenta",
    },
    quickActions: { heading: "Acciones rápidas", post: "Publicar una necesidad", board: "Ver el Tablero de necesidades", requests: "Ver mis solicitudes", inbox: "Ver la bandeja de entrada" },
    inboxReminder: { heading: "Tiene novedades pendientes", description: "Consulte su bandeja de entrada para ver la actividad reciente." },
  },

  NEW_REQUEST_COPY: {
    back: "← Volver al panel",
    title: "Publicar una necesidad",
    // needs review: privacy guidance.
    intro:
      "Diga a las organizaciones qué se necesita, para cuántas personas y cuándo. Solo se comparte el barrio. No incluya nombres, direcciones ni ubicaciones de campamentos.",
    privacyLabel: "Privacidad",
    // needs review: the privacy notice (exact wording in English; legal-sounding).
    privacy:
      "The Bridge guarda la necesidad de recursos, el barrio, el horario y el estado de la revisión de privacidad. Las solicitudes pendientes de revisión conservan solo un borrador seguro revisado por separado y las categorías detectadas, no el texto original señalado. Los artículos, las notas y el barrio se envían a Anthropic para su revisión. No comparta nombres, direcciones ni ubicaciones exactas.",
    loading: "Cargando…",
  },

  NEW_REQUEST_FORM: {
    sections: { what: "Qué se necesita", whereWhen: "Dónde y cuándo" },
    peopleCount: "¿Cuántas personas?",
    category: "Tipo de apoyo",
    categoryPlaceholder: "Elija un tipo",
    items: "Qué se necesita",
    itemsPlaceholder: "Ejemplo: 10 abrigos de invierno, tallas M–XL",
    itemsHelp: "Describa los artículos que se necesitan, no a las personas. No incluya nombres, datos de salud ni ubicaciones exactas.",
    notes: "Notas (opcional)",
    notesPlaceholder: "Ejemplo: tallas, necesidades alimentarias o cantidades por persona",
    notesHelp: "{n}/300. Sin nombres ni otros datos personales.",
    neighborhood: "Barrio",
    neighborhoodPlaceholder: "Elija un barrio",
    window: "¿Cuándo puede recibirlo? (hora de Chicago)",
    windowStart: "Desde",
    windowEnd: "Hasta",
    submit: "Enviar solicitud",
    pending: "Enviando…",
  },

  REQUEST_COPY: {
    person: "persona",
    people: "personas",
    peopleLabel: "Personas",
    where: "Dónde",
    when: "Cuándo",
    notes: "Notas",
    title: "{items} para {people}",
  },

  REQUEST_ACTIONS: {
    claim: {
      label: "Reclamar esta necesidad",
      question: "¿Reclamar esta necesidad? Verá la información de contacto de quien la publicó para coordinar la entrega.",
      confirm: "Sí, reclamarla",
    },
    deliver: {
      label: "Marcar como completada",
      question: "¿Llegaron los artículos? Esto marca la solicitud como completada.",
      confirm: "Sí, marcar como completada",
    },
    cancel: {
      label: "Cancelar",
      question: "¿Cancelar esta solicitud? Las organizaciones ya no la verán.",
      confirm: "Sí, cancelarla",
    },
    notNow: "Ahora no",
    pending: "Un momento…",
  },

  BOARD_COPY: {
    title: "Tablero de necesidades",
    intro:
      "Primero aparecen las necesidades abiertas y luego las que ya reclamó otra organización. Abra una nota para ver los detalles y reclamarla.",
    loading: "Cargando el Tablero de necesidades…",
    empty: "No hay necesidades abiertas en este momento. Vuelva a consultar pronto.",
    stamp: "Reclamada",
    yourPost: "Su publicación",
    status: "Estado:",
  },

  DETAIL_COPY: {
    backToBoard: "← Volver al Tablero de necesidades",
    backToDashboard: "← Volver al panel",
    loading: "Cargando…",
    posted: "Publicada",
    timelineHeading: "Estado",
    timeline: { posted: "Publicada", claimed: "Reclamada", fulfilled: "Completada", cancelled: "Cancelada" },
    notYet: "Todavía no",
    timeNotRecorded: "Hora no registrada",
    contactAfterClaim: "La información de contacto aparece después de reclamarla.",
    claimedByOther: "Otra organización la reclamó.",
    youClaimed: "Su organización reclamó esta necesidad.",
  },

  INBOX_COPY: {
    heading: "Bandeja de entrada",
    intro: "Novedades sobre sus solicitudes, conexiones y cuenta.",
    loading: "Cargando su bandeja de entrada…",
    markAllRead: "Marcar todo como leído",
    empty: "Está al día. Cuando haya novedades sobre sus solicitudes o conexiones, aparecerán aquí.",
    unread: "No leído",
    titles: { need_claimed: "Necesidad reclamada", need_fulfilled: "Necesidad completada", org_approved: "Organización aprobada", org_rejected: "Organización no aprobada", privacy_pending: "Revisión de privacidad pendiente", privacy_approved: "Revisión de privacidad aprobada", privacy_changes: "Cambios solicitados", privacy_rejected: "Revisión de privacidad no aprobada", privacy_new_review: "Nueva revisión de privacidad" },
    messages: {
      needClaimed: "{org} reclamó su necesidad: {items}",
      needFulfilled: "{poster} marcó como completada una necesidad que usted apoyó.",
      orgApproved: "Su organización fue aprobada. Ahora puede reclamar y publicar necesidades.",
      orgRejected: "Su organización no fue aprobada. Si tiene preguntas, escriba a {email}.",
      orgRejectedNoEmail: "Su organización no fue aprobada.",
      privacyPending: "Su solicitud está pendiente de revisión de privacidad. Todavía no aparece en el Tablero de necesidades.",
      privacyApproved: "Su solicitud pasó la revisión de privacidad y ya aparece en el Tablero de necesidades.",
      privacyChanges: "Se solicitaron cambios en su solicitud. Abra su panel para editarla.",
      privacyRejected: "Su solicitud no fue aprobada para su publicación. Abra su panel para ver su estado.",
      privacyNewReview: "Hay una nueva necesidad pendiente de revisión de privacidad.",
    },
    someOrganization: "Una organización",
    someone: "La persona que la publicó",
    bellLabel: "Bandeja de entrada, {n} sin leer",
    bellLabelNone: "Bandeja de entrada, nada sin leer",
    menuItem: "Bandeja",
  },

  NOT_FOUND_COPY: {
    title: "Página no encontrada",
    home: "Volver al inicio",
    imageAlt: "404. Ilustración de dos personas cruzando un puente dorado frente al horizonte de Chicago.",
  },

  NAV_COPY: { label: "Principal", menu: "Menú", dashboard: "Panel", board: "Tablero de necesidades", admin: "Administración" },

  ADMIN_COPY: {
    backToDashboard: "← Volver al panel",
    loading: "Cargando…",
    tabsLabel: "Estado de revisión",
    verificationLabel: "Verificación",
    opensInNewTab: "(se abre en una pestaña nueva)",
    notRecorded: "—",
    pending: "Un momento…",
    title: "Revisión de organizaciones",
    intro: "Las organizaciones pueden reclamar necesidades y ver información de contacto solo después de que una persona las apruebe aquí.",
    tabs: { pending: "Pendientes", approved: "Aprobadas", rejected: "Rechazadas" },
    empty: {
      pending: "No hay organizaciones esperando revisión.",
      approved: "Todavía no hay organizaciones aprobadas.",
      rejected: "No hay organizaciones rechazadas.",
    },
    fields: {
      website: "Sitio web",
      ein: "EIN",
      contact: "Contacto",
      email: "Correo electrónico",
      applied: "Solicitud",
      reviewedBy: "Revisada por",
      reviewed: "Revisión",
      note: "Nota interna",
    },
    irsLink: "Buscar en IRS Tax Exempt Organization Search",
    checklistTitle: "Antes de aprobar, compruebe:",
    checklist: [
      "El sitio web coincide con el nombre de la organización",
      "El EIN aparece en la búsqueda del IRS (si se dio)",
      "El dominio del correo de contacto coincide con el sitio web (si es posible)",
    ],
    approve: "Aprobar",
    reject: "Rechazar",
    revoke: "Revocar aprobación",
    notNow: "Ahora no",
    confirmApprove: "¿Aprobar a {org}? Podrá reclamar necesidades y ver información de contacto.",
    confirmReject: "¿Rechazar a {org}? Verá que no fue aprobada y no podrá reclamar necesidades.",
    // needs review: explains the consequences of revoking.
    confirmRevoke:
      "¿Revocar la aprobación de {org}? No podrá reclamar necesidades ni ver información de contacto, y sus publicaciones abiertas se ocultarán.",
    yesApprove: "Sí, aprobar",
    yesReject: "Sí, rechazar",
    yesRevoke: "Sí, revocar",
    noteLabel: "Nota interna (opcional, solo la ven los administradores)",
    noteCount: "{n}/300",
  },

  CONTACT_COPY: {
    supportedBy: "Con el apoyo de",
    postedBy: "Publicada por",
    emailLabel: "Correo electrónico",
    // needs review: privacy guidance for the handoff.
    note: "Use este dato para coordinar la entrega. No comparta nombres ni detalles de las personas que reciben ayuda.",
  },
  PRIVACY_COPY: {
    disclosure: "Para proteger la privacidad, la IA de Anthropic revisa los detalles de la solicitud antes de publicarla. Evite compartir nombres, direcciones exactas o datos que permitan identificar a alguien.",
    checking: "Revisando la privacidad de su solicitud…",
    unavailable: "La revisión de privacidad no está disponible en este momento. Su solicitud no se publicó. Vuelva a intentarlo.",
    flaggedTitle: "Revisión de privacidad: revise su solicitud",
    flaggedIntro: "Su solicitud podría contener datos que identifiquen a alguien o revelen una ubicación exacta. Edítela y vuelva a intentarlo.",
    appliedIntro: "La redacción sugerida se añadió a Notas. Revise Qué se necesita y los demás textos por si contienen datos sensibles. Después, vuelva a enviar la solicitud para una nueva revisión de privacidad.",
    suggested: "Ejemplo de redacción más segura",
    category: {
      exact_address: "Esto parece una dirección o un número de edificio.",
      unit_identifier: "Esto parece un número de unidad, habitación o piso.",
      precise_location: "Esto parece una ubicación precisa o un punto en un mapa.",
      vulnerable_person_identification: "Esto podría identificar a una persona o el lugar donde se queda.",
    },
    edit: "Editar su solicitud",
    applySuggestion: "Usar esta redacción",
    reviewQueued: "Su solicitud está pendiente de revisión de privacidad. No es visible públicamente.",
    reviewHeading: "Revisión de privacidad",
    backToAdmin: "← Volver a administración",
    reviewEmptyTitle: "Todo al día",
    reviewEmpty: "No hay solicitudes pendientes de revisión de privacidad.",
    reviewIntro: "Aquí solo se muestra el borrador que pasó el filtro automático de privacidad. Revíselo antes de publicarlo.",
    pendingCount: "{n} pendientes",
    requestInfo: "Versión segura de la solicitud",
    screeningInfo: "Resultados de la revisión de privacidad",
    created: "Enviada",
    risk: "Nivel de riesgo",
    categories: "Categorías detectadas",
    status: "Estado",
    statusLabels: { pending_review: "Pendiente de revisión de privacidad", changes_requested: "Se solicitaron cambios", approved: "Aprobada", rejected: "Rechazada", superseded: "Revisada y reenviada" },
    medium: "Necesita revisión humana",
    approve: "Aprobar versión segura",
    changes: "Solicitar cambios",
    reject: "Rechazar solicitud",
    reasonLabel: "Motivo",
    reasonPrompt: "Elija un motivo",
    reasons: { privacy_detail: "Quite los datos que podrían identificar a una persona o ubicación.", insufficient_detail: "Aclare qué recursos se necesitan sin incluir datos personales.", outside_scope: "Esta solicitud no corresponde a los recursos que The Bridge ofrece actualmente." },
    decisionError: "No pudimos completar esta revisión. Vuelva a intentarlo.",
    myHeading: "Solicitudes en revisión de privacidad",
    revise: "Editar borrador seguro",
    poweredBy: "Con tecnología de",
    provider: "Haiku 5.5",
    providerLabel: "Con tecnología de Anthropic, Haiku 5.5 (se abre en una pestaña nueva)",
  },
}

const DICTIONARIES: Record<Lang, Copy> = { en, es }

/** All copy in one language. */
export function copyFor(lang: Lang): Copy {
  return DICTIONARIES[lang]
}

/** "{n} characters left" → "12 characters left". */
export function fill(text: string, values: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m))
}

// Messages written in English by shared code that runs outside the page (the request
// rules, the form validation), which the tests read in English. Pages and actions show
// them through translateMessage(), so they appear in the reader's language.
const MESSAGES_ES: Record<string, string> = {
  // Request rules (src/lib/request-rules.ts)
  "Only organization accounts can claim needs.": "Solo las cuentas de organización pueden reclamar necesidades.",
  "Only the person who posted this request can change it.": "Solo la persona que publicó esta solicitud puede cambiarla.",
  "Your organization is still under review, so you can't do this yet.": "Su organización todavía está en revisión, así que aún no puede hacer esto.",
  "Your organization wasn't approved, so you can't do this.": "Su organización no fue aprobada, así que no puede hacer esto.",
  "Only outreach accounts and approved organizations can post needs.": "Solo las cuentas de alcance comunitario y las organizaciones aprobadas pueden publicar necesidades.",
  "Only admins can review organizations.": "Solo los administradores pueden revisar organizaciones.",
  "We couldn't find that request.": "No encontramos esa solicitud.",
  "This is your own post, so you can't claim it.": "Esta es su propia publicación, así que no puede reclamarla.",
  "Another organization just claimed this need.": "Otra organización acaba de reclamar esta necesidad.",
  "This request was cancelled.": "Esta solicitud fue cancelada.",
  "This request isn't available right now.": "Esta solicitud no está disponible en este momento.",
  "You claimed this need. Thank you!": "¡Reclamó esta necesidad! Gracias.",
  "Marked as fulfilled.": "Marcada como completada.",
  "Request cancelled.": "Solicitud cancelada.",
  "No organization has claimed this need yet.": "Ninguna organización ha reclamado esta necesidad todavía.",
  "An organization already claimed this need, so it can't be cancelled here.": "Una organización ya reclamó esta necesidad, así que no se puede cancelar aquí.",
  "This request is already fulfilled.": "Esta solicitud ya está completada.",
  "This request is already cancelled.": "Esta solicitud ya está cancelada.",
  "This request is already in progress.": "Esta solicitud ya está en curso.",
  "This request is already open.": "Esta solicitud ya está abierta.",
  "We couldn't save your request. Please try again.": "No pudimos guardar su solicitud. Vuelva a intentarlo.",
  "Keep the note under 300 characters.": "Use menos de 300 caracteres en la nota.",
  "Something's wrong with that review.": "Algo no está bien en esa revisión.",
  "We couldn't find that organization.": "No encontramos esa organización.",
  "Organization approved.": "Organización aprobada.",
  "Organization rejected.": "Organización rechazada.",
  // Form validation (src/lib/validation.ts)
  "Enter a valid email address.": "Escriba un correo electrónico válido.",
  "Use at least 8 characters.": "Use al menos 8 caracteres.",
  "Use 128 characters or fewer.": "Use 128 caracteres o menos.",
  "Use 120 characters or fewer.": "Use 120 caracteres o menos.",
  "Use 200 characters or fewer.": "Use 200 caracteres o menos.",
  "Use 80 characters or fewer.": "Use 80 caracteres o menos.",
  "Enter your password.": "Escriba su contraseña.",
  "Tell us your name.": "Díganos su nombre.",
  "Please confirm you'll describe needs, not people.": "Confirme que describirá necesidades, no personas.",
  "The passwords don't match.": "Las contraseñas no coinciden.",
  "Enter your organization's name.": "Escriba el nombre de su organización.",
  "Enter your website's full address, starting with https://": "Escriba la dirección completa de su sitio web, empezando con https://",
  "Use the format 12-3456789.": "Use el formato 12-3456789.",
  "Tell us who we can contact.": "Díganos con quién podemos comunicarnos.",
  "Please confirm you can represent this organization.": "Confirme que puede representar a esta organización.",
  "Pick a date and time.": "Elija una fecha y una hora.",
  "Enter a whole number.": "Escriba un número entero.",
  "At least 1 person.": "Al menos 1 persona.",
  "500 people is the most for one request.": "El máximo es 500 personas por solicitud.",
  "Choose the type of support.": "Elija el tipo de apoyo.",
  "Describe what's needed.": "Describa qué se necesita.",
  "Keep this under 200 characters.": "Use menos de 200 caracteres.",
  "Keep notes under 300 characters.": "Use menos de 300 caracteres en las notas.",
  "Choose a neighborhood.": "Elija un barrio.",
  "The end time must be after the start time.": "La hora de fin debe ser posterior a la hora de inicio.",
}

/** A message from the shared rules or validation, in the reader's language. */
export function translateMessage(message: string, lang: Lang): string {
  return lang === "es" ? (MESSAGES_ES[message] ?? message) : message
}

// The Spanish terms the assistant must use for app labels (English → Spanish). Built from
// the dictionaries above, so the assistant and the screens always use the same words.
export const SPANISH_GLOSSARY: readonly (readonly [string, string])[] = [
  [en.ROLE_CTAS.outreach.label, es.ROLE_CTAS.outreach.label],
  [en.ROLE_CTAS.donor.label, es.ROLE_CTAS.donor.label],
  [en.REQUEST_ACTIONS.claim.label, es.REQUEST_ACTIONS.claim.label],
  [en.BOARD_COPY.title, es.BOARD_COPY.title],
  [en.BOARD_COPY.stamp, es.BOARD_COPY.stamp],
  [en.LABELS.status.open, es.LABELS.status.open],
  [en.LABELS.status.claimed, es.LABELS.status.claimed],
  [en.LABELS.status.delivered, es.LABELS.status.delivered],
  [en.LABELS.status.cancelled, es.LABELS.status.cancelled],
  ["Outreach worker", "Trabajador de alcance comunitario"],
  [en.LABELS.role.donor, es.LABELS.role.donor],
  [en.LABELS.category.food, es.LABELS.category.food],
  [en.LABELS.category.clothing, es.LABELS.category.clothing],
  [en.LABELS.category.hygiene, es.LABELS.category.hygiene],
  [en.LABELS.category.other, es.LABELS.category.other],
  [en.NEW_REQUEST_FORM.neighborhood, es.NEW_REQUEST_FORM.neighborhood],
  [en.NAV_COPY.dashboard, es.NAV_COPY.dashboard],
  [en.INBOX_COPY.heading, es.INBOX_COPY.heading],
]

// English copy under its usual names, for the assistant prompt, the request rules, and
// the tests.
export const {
  HERO_BADGE,
  HERO_HEADLINE,
  HERO_LEAD,
  HERO_DESCRIPTION,
  HERO_IMAGE,
  BRIDGE_IMAGE,
  ROLE_CTAS,
  HOW_IT_WORKS_HEADING,
  JOURNEY,
  COMMUNITY_IMPACT_COPY,
  WHAT_IS_HEADING,
  WHAT_IS_PARAGRAPHS,
  MISSION_HEADING,
  MISSION,
  FOOTER_TEXT,
  ASSISTANT_COPY,
  AUTH_ERRORS,
  AUTH_COPY,
  VERIFICATION_COPY,
  DASHBOARD_COPY,
  NEW_REQUEST_COPY,
  NEW_REQUEST_FORM,
  REQUEST_COPY,
  REQUEST_ACTIONS,
  BOARD_COPY,
  DETAIL_COPY,
  INBOX_COPY,
  NOT_FOUND_COPY,
  NAV_COPY,
  ADMIN_COPY,
  CONTACT_COPY,
} = en
