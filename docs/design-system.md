# The Bridge: design system and redesign plan

Status: **Phases 1–7 complete.** This document records the design direction ("Editorial & Bold × Connection & Movement"), the tokens and components that carry it, and the implementation history. Earlier audit and proposal sections are retained for context; section 9 records the completed phases.

The existing Spanish copy was reviewed and verified by two fluent Spanish speakers.

The post form now uses the existing notice styling for privacy screening results and a scoped Anthropic attribution badge adapted from the supplied Uiverse reference. The admin privacy queue uses the existing cards, page header, and empty state.

---

## 1. Design audit

### 1.1 Assets

| Asset | Size | Findings |
|---|---|---|
| `public/brand/the-bridge-logo-dark.png` (since deleted) | 2172 × 724 | Ivory "The", sky-blue "Bridge", gold crescent arch. **Transparent background** (77% of pixels have alpha 0; no solid navy panel). Edges are ragged (AI-generated halos), and the "g" cut-out where it crosses the arch is blotchy. |
| `public/brand/the-bridge-logo-light.png` (since deleted) | 2172 × 724 | Navy "The", brighter blue "Bridge", same arch. Also transparent, same edge artifacts. |
| `public/images/hero-community.jpg` | 1536 × 1024 (3:2 landscape), 2.4 MB | Overhead view of many hands joined in a circle, boxes of canned food, bottled water and produce around them, warm natural light. AI-generated. The joined hands sit near the center (about 50% across, 45% down), so a portrait crop keeps the subject. |

Neither PNG is placed on the page. They are the reference for a rebuilt SVG logo (section 3.1), and the dark PNG is the source for the favicon and social preview image.

**Colors sampled from the PNGs** (dominant color of solid areas, ragged edges excluded):

| Region | Dark reference | Light reference |
|---|---|---|
| "The" | `#f8f3e4` (ivory) | `#01182d` (navy) |
| "Bridge" | `#01a3fc` (sky blue) | `#199ef4` (brighter blue) |
| Arch, left end | `#e99b09` | `#e29a12` |
| Arch, left third | `#f4ac21` | `#efab21` |
| Arch, center (lightest) | `#fcd25a` | `#fbd558` |
| Arch, right third | `#fcb528` | `#f9b427` |
| Arch, right end | `#fcb429` | `#f9b427` |

Contrast of the logo colors on the page backgrounds. Logos are exempt from WCAG 1.4.3 and 1.4.11, so this is informational:

| Color | On dark `#020617` | On light `#f5f2ea` |
|---|---|---|
| "The" | 18.19:1 | 16.05:1 |
| "Bridge" | 7.34:1 | **2.59:1** |
| Arch (darkest stop) | 8.80:1 | **2.12:1** |

Light mode's "Bridge" blue and gold arch are soft on ivory. They meet the logo exemption, but see decision D2 in section 10.

### 1.2 Routes (what exists; nothing is invented)

| Route | Purpose |
|---|---|
| `/` | Landing page: hero, "How it works" (5 steps), "What is The Bridge?", Mission Statement, footer |
| `/sign-in` | Tabs: Sign in, Create account (I'm posting needs / I'm an organization) |
| `/dashboard` | Outreach: impact stats, Your requests. Organization: stats, Open requests (the "Needs Board"), Needs you're supporting, Your posts, pending/rejected banners |
| `/requests/new` | Post a Need form, privacy notice |
| `/admin` | Organization review: Pending / Approved / Rejected tabs, review cards with confirmations |
| Chat panel | On the landing page and every signed-in page |
| Not-found | Next.js default |

There is no separate Offer Support page, request detail page, inbox, search or filters yet. Offer Support is the organization dashboard's open-requests list.

### 1.3 Earlier design decisions: verified

| Decision | State in code |
|---|---|
| Arched navbar wordmark | Yes: `components/brand/arched-wordmark.tsx` (Raleway text on a curved path plus a thin gold line). **Will be replaced** by the new logo. |
| Raleway headings | Yes: `--font-heading` and the `font-heading` utility, with lining numerals. Body is Geist. |
| Card glow | Yes: duplicated `GLASS` constants in `app/page.tsx` and `assistant-chat.tsx` (blur, translucent fill, blue outer glow). |
| 16px form inputs | Yes, at every width (commit `f3b7109`). |
| Light/dark themes | Yes: `next-themes`, dark default, `.dark` class, tokens on `:root` and `.dark`. |
| 12px radius | Yes: every `--radius-*` maps to 12px; `rounded-full` only on pills, dots and the chat button. Exception: the homepage's How it works, What is The Bridge? and Mission cards use 8px (`rounded-[0.5rem]`). |
| 44px targets | Yes: `--tap-min`, used by buttons, links and controls. The homepage calls to action (`CtaLink`, the Uiverse.io letter-reveal design) are 50px tall. |
| Reduced motion | Yes: global CSS rule plus `motion-reduce:` classes; `NumberTicker` uses `useReducedMotion`. |
| Copy in `src/lib/copy.ts` | **Partly.** About 60 user-facing strings still live in components (counts below). |

### 1.4 What works well

- One token layer in `globals.css`, with WCAG contrast measured and documented, light and dark complete, and shadcn aliases derived from the brand tokens.
- No stray hex colors in components (the only one is `themeColor` in `layout.tsx`).
- Consistent 12px radius, 44px targets, 16px inputs, visible focus rings.
- Gold is already used only as a fill (the hero badge), never as text.
- Accessible patterns already in place: ARIA tabs and radiogroup on sign-in, the phone menu disclosure, inline confirmations, labelled form fields with linked errors.
- Motion is already reduced-motion safe.

### 1.5 Inconsistent, duplicated, or bypassing tokens

| Finding | Where |
|---|---|
| Glass recipe defined twice, with slightly different opacity and shadow | `app/page.tsx` (`GLASS`), `assistant-chat.tsx` (`GLASS`) |
| Five arbitrary `shadow-[…]` values (CTA glow, glass glow, chat button glow) | `app/page.tsx`, `assistant-chat.tsx` |
| `border-white/10` and `border-black/10` instead of a border token | landing glass cards, chat panel |
| `bg-black/40` scrim | chat panel |
| Hero glows: three large blurred circles (`blur-3xl`), the "generic centered gradient" look | `components/hero-glows.tsx` |
| Glass on content cards (journey, What is, Mission) | `app/page.tsx`, against the new rule (glass only for header, chat, dialogs, menus) |
| Section headings re-typed in each page (`font-heading text-xl font-bold…`) | landing, dashboard, admin |
| Page title blocks re-typed (back link, h1, intro) | `/requests/new`, `/admin` |
| Empty states: two separate implementations | dashboard `EmptyState`, admin inline `<p>` |
| Banner / notice styles: three variants | verification banner, privacy notice, form error |
| Strings outside `copy.ts` | dashboard (15), request form (12), landing (10, including the "How it works" steps), request-action-button (9), admin (5), request card (3), others (7) |
| Unused UI components | `ui/border-beam.tsx`, `ui/dot-pattern.tsx` (installed, never imported) |
| Default Next.js favicon; no social preview image | `src/app/favicon.ico` |

### 1.6 Reusable as-is

`Button` (cva variants, 44px), `Card` and subparts, `Badge`, `Input`, `Textarea`, `Select`, `Label`, `Form`, `StatusBadge`, `CategoryBadge`, `RequestCard`, `ImpactStat` (+ `NumberTicker`), `BlurFade` (motion), `ThemeToggle`, `HeaderNav`, `AssistantChat`, `RequestActionButton`, `ReviewActions`, the sign-in `form-fields` (TextField, PledgeField, FormError).

### 1.7 What should be standardized

Section and page headers, empty states, banners/alerts, the glass recipe (one utility, used only where allowed), shadows (token-only), the arch motif (one source path), a loading indicator, and the remaining copy.

### 1.8 Needs redesign

Logo; hero (centered, symmetrical, glow circles, gold pill); landing content cards (glass → solid); CTA styling; navigation polish; section rhythm on the landing page; request card hierarchy; dashboard headers; admin cards; chat panel surface.

### 1.9 Risks

| Risk | Mitigation |
|---|---|
| **`.env.local` currently points `DATABASE_URL` at production** (with dev's Neon Auth). | Fix before any phase that checks signed-in pages; the seed and tests already refuse. |
| Logo letterforms: the references use a geometric sans that isn't loaded. An SVG with live text depends on the font. | Outline the glyphs into static SVG paths once (decision D1). |
| Hero photo is 2.4 MB. | `next/image` serves AVIF/WebP at responsive sizes; `priority` on the hero; fixed aspect boxes so nothing shifts. |
| Large display type at 320px, plus Spanish later (+20–30% length). | Fluid `clamp()` sizes tested at 320px with long-string checks; no fixed-width text containers. |
| Backdrop blur cost on low-end phones. | Glass limited to header, chat, dialogs and menus. |
| Hero motion delaying interaction. | Content is never hidden from assistive tech or blocked; the whole sequence finishes within 900 ms, and reduced motion shows everything at once. |
| Copy moves changing wording by accident. | Moves are mechanical; a test compares rendered text before and after for unchanged sections. |
| Redesign touching behavior. | No changes to routes, actions, rules, auth, schema, the assistant, or chat logic; the existing test suites run every phase. |

---

## 2. Creative direction

**Editorial & Bold × Connection & Movement.** Typography carries the design. Composition is asymmetric and architectural. The gold arch is the one recurring graphic idea: a line that connects two sides.

- **Editorial:** oversized Raleway display type, tight tracking, deliberate line breaks, a small uppercase eyebrow with a gold rule, generous negative space, left-aligned text blocks with a comfortable measure (about 60 characters).
- **Bold:** one dominant headline per page, high contrast ivory on deep navy, few elements, each one large enough to matter.
- **Connection:** the arch links headline to photograph on the homepage, underlines section starts, and becomes the loader. Never more than one arch in view at a time.
- **Movement:** short, purposeful motion: the arch draws itself, text rises a few pixels, CTAs nudge their arrows. Nothing loops except the loader.

The homepage is the most expressive page. Sign-in is calm and branded. Dashboards, the request form, and admin are quiet, structured, and fast, recognizably The Bridge through type, color, and one arch accent at most.

---

## 3. Brand system

### 3.1 Logo (the artwork PNGs, cleaned)

**Changed during Phase 2 review:** the outlined-Poppins SVG was dropped in favor of new
artwork with striped lettering (originals in `design/source/new-dark-logo.png` and
`new-light-logo.png`; the first logo PNGs were deleted).

- **Files used:** `public/brand/logo-dark.png` (dark mode: ivory "The") and `logo-light.png`
  (light mode: navy "The"), both made from the new PNGs with a one-time cleanup: an alpha
  "levels" step (below 25% opacity → transparent, 98% and up → opaque) removed the faint light
  haze in the stripe gaps and about 77,000 stray specks, and each was cropped to the artwork.
  The originals stay alongside as sources.
- **Component:** `components/brand/logo.tsx` renders both through `next/image`; CSS shows the
  one for the current theme. Decorative (`alt=""`); the home link keeps its accessible name.
- **Sizes:** 116 px below 360 px, 128 px on other phones, 152 px from 640 px: the smallest
  sizes at which all the stripes stay separate on 2x and 3x screens (measured on the T's stem).
  On 1x screens they soften at any header size. Below 360 px, "Sign out" is an icon (named
  "Sign out") so the logo fits on one row.
- **Arch motif:** `components/brand/arch.tsx` is fitted to the new logo's arch (curve and
  sampled gold: `--arch-1` → `--arch-2` → `--arch-3` per theme), used by the hero connector.
- **Favicon and social preview:** `src/app/icon.png` (512), `apple-icon.png` (180) and
  `opengraph-image.png` (1200 × 630), made from the cleaned dark logo: a striped "B" over the
  arch on navy, and the full logo on navy.

### 3.2 Color

The palette stays: midnight navy, blue-navy surfaces, warm ivory, sky-blue accents, metallic gold (fills and graphics only, never text). Additions are surface steps, the logo colors, and named states.

**Error, warning, success:** the palette deliberately has no red, and errors already use full-strength text plus a border, an icon, and wording. The plan keeps that rule (decision D4): success uses blue, warning uses gold as a fill with navy text, error uses foreground text with a strong border and an alert icon.

### 3.3 Typography

- Display and headings: **Raleway** (700/800), lining numerals, tight tracking on display sizes.
- Body and UI: **Geist** (unchanged).
- Eyebrows and labels: Geist, uppercase, letter-spacing 0.14em, ivory or blue text, never gold.

### 3.4 Golden arch motif

One shape, used sparingly, never more than once in view:

| Use | Treatment |
|---|---|
| Logo | Filled crescent with gold gradient |
| Hero | A thin arch line draws from the headline toward the photograph, once, on load |
| Hero photo frame | The photo's top edge is cut as a shallow arch (a mask using the same curve) |
| Section starts (landing only) | A short arch rule (48 px) above section eyebrows |
| Loader | The arch drawing itself and fading out (section 5.4) |
| Empty states | A small static arch above the message |

Not used in dashboards beyond the loader and empty states, not on buttons, not as background decoration.

### 3.5 Photography

One art-directed photograph (the hero). Natural color, no blue overlay, no heavy filters. The crop centers the joined hands and keeps supplies visible at the edges. A very light navy gradient sits only at the edge where the photo meets the page, to settle it into the dark background. The image is AI-generated, so captions or alt text never present it as a real event. Alt text: "Volunteers join hands above boxes of food and community supplies."

### 3.6 Background and atmosphere

Replace the three blurred circles with:

- a two-step navy base (`--background` → `--background-deep` toward the bottom of the hero),
- one directional light: a soft, low-opacity linear wash from the top-left (the light falls on the headline),
- very fine architectural lines: two hairlines (4% opacity) following the arch curve behind the hero,
- light mode: warm ivory with the same hairlines in navy at 6% opacity.

No blobs, no colored gradients, no noise textures heavier than 2% opacity.

---

## 4. Design tokens

Tokens live in `src/app/globals.css` (`:root` = light, `.dark` = dark) and are exposed through `@theme inline`. New names are marked **new**.

### 4.1 Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#f5f2ea` | `#020617` | Page |
| `--background-deep` **new** | `#ece7da` | `#010412` | Hero base, footer |
| `--surface` | `#ffffff` | `#0b1220` | Cards, panels |
| `--surface-raised` **new** | `#ffffff` | `#111a2b` | Hovered interactive cards, menus |
| `--foreground` | `#19354a` | `#f5f2ea` | Primary text |
| `--muted-foreground` | `#4a6070` | `#a9b8c4` | Secondary text |
| `--primary` | `#1f4e79` | `#6fa8d6` | Fills: primary button, active states |
| `--primary-text` | `#1f4e79` | `#8cbbe3` | Blue text and links |
| `--primary-foreground` | `#ffffff` | `#0f1f2b` | Text on primary |
| `--secondary` (= `--muted`) | `#e8e3d6` | `#223a4d` | Quiet fills, tabs |
| `--border` | `#e8e3d6` | `#223a4d` | Card borders |
| `--border-strong` **new** | `#8a8170` | `#557290` | Inputs, dividers that must be seen (≥ 3:1 for inputs; measured in Phase 1) |
| `--ring` | `#1f4e79` | `#6fa8d6` | Focus |
| `--gold`, `--gold-gradient` | unchanged | unchanged | Fills only |
| `--gold-foreground` | `#19354a` | `#19354a` | Text on gold |
| `--logo-the` **new** | `#01182d` | `#f8f3e4` | Logo |
| `--logo-bridge` **new** | `#199ef4` | `#01a3fc` | Logo |
| `--arch-1/2/3` **new** | `#e29a12 / #fbd558 / #f9b427` | `#e99b09 / #fcd25a / #fcb429` | Arch gradient stops |
| `--success` **new** | `= --primary` | `= --primary` | Positive state (with icon and text) |
| `--warning` **new** | `= --gold` (fill) | `= --gold` (fill) | Notices (text: `--gold-foreground`) |
| `--destructive` | `= --foreground` | `= --foreground` | Errors (strong text, border, icon; no red) |
| `--scrim` **new** | navy 40% | black 50% | Behind sheets and dialogs |

### 4.2 Typography scale

All sizes are fluid between 320 px and 1280 px.

| Token | Size | Line height | Weight / font | Use |
|---|---|---|---|---|
| `display` | phones `clamp(2.5rem, 5vw, 4.5rem)` (may wrap); from 768 px one line, `min(100cqi / 7.12, 4.5rem)`; from 1024 px `85cqi / 7.12` | 1.2 | Zen Tokyo Zoo 400 (striped display face), no tracking | "Bridging the Gap." only |
| `display-sub` | removed: "Every Connection is a Step Forward." now uses `h2` (`clamp(1.5rem, 3.5vw, 2rem)`), and the lead under it uses `lead` | | | |
| `h1` | `clamp(1.875rem, 5vw, 2.5rem)` | 1.1 | Raleway 700 | Page titles |
| `h2` | `clamp(1.5rem, 3.5vw, 2rem)` | 1.15 | Raleway 700 | Section titles |
| `h3` | `1.125rem` | 1.3 | Raleway 700 | Card titles |
| `lead` | `clamp(1.0625rem, 2vw, 1.25rem)` | 1.55 | Geist 400 | Intros |
| `body` | `1rem` | 1.6 | Geist 400 | Text |
| `small` | `0.875rem` | 1.5 | Geist 400 | Help text |
| `label` | `0.875rem` | 1.3 | Geist 500 | Form labels |
| `eyebrow` | `0.75rem` | 1.2 | Geist 600, uppercase, +0.14em | Eyebrows, metadata labels |

### 4.3 Spacing and layout

| Token | Value | Use |
|---|---|---|
| Base unit | 4 px (Tailwind scale) | Everything |
| `page-gutter` | 16 px below 640, 24 px from 640, 32 px from 1024 | Page side padding |
| `container` | 1120 px (landing), 1024 px (app), 576 px (forms) | Max widths |
| `section-y` | `clamp(4rem, 10vw, 7.5rem)` landing; 3 rem app | Vertical rhythm |
| `card-pad` | 16 px phones, 24 px from 640 | Cards |
| `stack` | 24 px between form fields; 12 px label ↔ field ↔ help | Forms |
| `grid-gap` | 12 px phones, 20 px from 640 | Card grids |
| Header height | 64 px (56 below 640) | Navigation |

### 4.4 Shape and elevation

| Token | Value |
|---|---|
| `--radius` | 12 px everywhere (unchanged); `rounded-full` only for pills, dots, avatars, the chat button |
| `shadow-sm` | existing soft navy shadow (cards at rest) |
| `shadow-md` | existing (menus, raised cards) |
| `shadow-lg` **new** | `0 24px 48px -16px` navy 22% (dialogs, chat panel) |
| `glass` **new utility** | `bg-background/85 backdrop-blur-xl border border-border/60 shadow-lg`. **Only** for header, chat panel, dialogs, menus. A menu inside the glass header (the phone menu) uses solid `--surface-raised`: a nested blur can't reach the page behind the header, so a translucent panel shows page text through it |
| `glow-primary` **new utility** | the existing CTA glow, defined once; primary CTA hover only |
| Card | solid `--surface`, 1 px `--border`, `shadow-sm`; interactive cards lift to `--surface-raised` + `shadow-md` |

### 4.5 Motion

| Token | Value | Use |
|---|---|---|
| `--duration-fast` | 120 ms | Press, color |
| `--duration-base` | 200 ms | Hover, menus, focus |
| `--duration-slow` | 320 ms | Panels, sheets |
| `--duration-draw` | 900 ms | Arch draw-on |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Entrances, hovers |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Arch draw, panels |
| Entrance distance | 8–12 px rise, opacity 0 → 1 | Text and image reveals |
| Reduced motion | No transforms, no draw-on (arch shown complete), opacity changes only, ≤ 120 ms | Everywhere |

---

## 5. Component plan

| Component | Variants / notes | Status |
|---|---|---|
| `Logo` | theme-aware SVG; `size` sm/md/lg; optional `animateArch` | **New** (replaces `ArchedWordmark`) |
| `ArchPath` / `ArchRule` | the motif: hero line, section rule, empty-state mark | **New** |
| `ArchLoader` | arch draws and fades; `role="status"` with a text label; reduced motion: static arch + text | **New** |
| `Button` | primary, secondary (outline), ghost, destructive, link, icon; sizes sm/md/lg (all ≥ 44px); `loading` state (spinner or loader + disabled + `aria-busy`) | Extend existing |
| `CtaLink` | hero CTA: arrow that nudges 4 px on hover, 2 px lift, pressed state; primary (blue fill) and secondary (outline) | **New** (wraps `Button`) |
| `Card` | standard (solid), interactive (hover lift), stat, glass (reserved: header, chat, dialogs, menus) | Extend existing |
| `Badge` | status (Open, In Progress, Fulfilled, Cancelled), category, info | Restyle existing |
| `RequestCard` | compact card: category badge, status badge, items (title), people count, neighborhood, time window, footer slot for actions | Refactor existing (Phase 4) |
| `RequestDetailLayout` | the need page (`/requests/[id]`): header (items, badges), key facts grid (people, neighborhood, window), notes, status timeline (Posted, Claimed, Fulfilled or Cancelled, with Chicago times), contact block, action area | **Routed** (Needs Board) |
| `StickyNote` | a need on the Needs Board: `sticky-note-card.png` (square, transparent) as the paper; text inset 11–90% across from 20% down (below the strip, which ends at 17.2%), facts stop at 84% across (clear of the small curl from 85% across and down); Raleway items (3 lines), navy badges, a deep blue "Claimed" stamp on In Progress needs; fixed note tokens (`--note-ink`, `--note-badge-foreground`, `--note-stamp`), the same in both themes; a tilt of -1.5° to 1.5° from the id, straightening and lifting on hover and focus (static with reduced motion) | **New** (Needs Board) |
| `LangSwitch` | EN / ES segmented control (`role=radiogroup`, labeled options, arrow keys, 44px): beside the theme toggle from 640px, in the phone menu below (signed-out visitors get a menu with just the switch); also on the sign-in page. Saves the `lang` cookie and reloads; proxy.ts serves the page from `app/[lang]` with the same address | **New** (Spanish) |
| `PageHeader` | back link (optional), eyebrow (optional), h1, intro, actions slot | **New** |
| `SectionHeader` | h2, optional description, actions slot; `arch` option on the landing page | **New** |
| `EmptyState` | arch mark, message, optional action | **New** (replaces two implementations) |
| `Notice` | info, success, warning, error; used for verification banners, privacy notice, form errors | **New** (replaces three styles) |
| Form controls | `Input`, `Textarea`, `Select`, `Checkbox` (pledge), `ToggleGroup` (account type), `FieldDescription`, `FieldError`: shared styles, 16 px, `--border-strong` | Consolidate existing |
| Confirm pattern | inline confirmation group (existing behavior) restyled consistently for actions and reviews | Restyle existing |
| Navigation | public header, signed-in header, phone menu: active states, glass header | Refine existing |
| Chat panel | glass surface via shared utility, message bubbles, input, loader | Restyle existing |

---

## 6. Page-by-page plan

| Page | Character | Plan |
|---|---|---|
| `/` | Bold, editorial | New hero (section 7); solid cards for "How it works" (content unchanged) with large step numerals and an arch rule; "What is The Bridge?" and Mission as editorial text blocks on solid surfaces (content unchanged); refined footer |
| `/sign-in` | Minimal, branded | Centered card on the deep navy base with the logo above; tabs and account-type toggle restyled with tokens; `Notice` for the review message; same fields and behavior |
| `/requests/new` | Welcoming, trustworthy | `PageHeader`; the privacy notice as a calm `Notice`; grouped fields with consistent spacing and "(optional)" labels; sticky-free primary action at the end; existing validation and submission unchanged |
| `/dashboard` (outreach) | Organized | `PageHeader` with greeting; stat cards; `SectionHeader` "Your requests" with the Post a Need action; `RequestCard` grid; `EmptyState` |
| `/dashboard` (organization) | Practical, action-oriented | Verification `Notice`; stats; "Open requests" (Needs Board) as `RequestCard` grid with clear primary action, "Your post" and "Available after approval" states; supporting and posts sections |
| `/admin` | Professional | `PageHeader`, refined tabs with counts, review cards with a clear field grid, verification aids, confirm pattern |
| Chat panel | Approachable | Glass surface, refined bubbles and input, arch loader for "Thinking…", same behavior |
| Not-found | Calm | Optional: a branded not-found page (arch mark, message, link home). Included only if approved (D5). Now illustrated: `not-found.png` (about 720px from 1024px, full width below, height capped at 100svh - 17rem, faint `hero-glow` behind it), the h1 "Page not found", and a 48px primary "Back to homepage" button. |

---

## 7. Homepage proposal

### 7.1 Composition

**Desktop (≥ 1024 px): asymmetric, about 58 / 42.**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo]                                       Sign in   ◐            │  glass header
├──────────────────────────────────────────────────────────────────────┤
│                                                ╭──────────────────╮ │
│  ── ROOTED IN CHICAGO · BUILT FOR CHANGE       │                  │ │
│                                                │   photograph     │ │
│  Bridging                                   ╭──┤   (portrait crop,│ │
│  the Gap.                         ·········╯   │   arched top)    │ │
│                                    gold arch   │                  │ │
│  Every Connection is a Step Forward.  line     │                  │ │
│                                                │                  │ │
│  Real needs. Real people. Real connections.    │                  │ │
│  The Bridge brings individuals, outreach …     ╰──────────────────╯ │
│                                                                      │
│  [ Post a Need  → ]   [ Offer Support  → ]                           │
│  Request support…      Respond with food…                           │
└──────────────────────────────────────────────────────────────────────┘
```

- The text column starts on a 12-column grid at column 1 and spans 7; the photo spans columns 8–12 and bleeds slightly past the container's right edge (to the page gutter), so the composition isn't a boxed two-column split.
- The photo's top edge is a shallow arch (same curve as the logo); corners elsewhere are 12px.
- One thin gold arch line draws from the end of "Gap." into the photo's arched edge: the visual "bridge" between words and people.

**Tablet (640–1023 px):** text full width (max 640), then the photo as a wide band (16:9) with the arched top, then the rest of the page.

**Phones (320–639 px):** the order is eyebrow, headline, secondary line, description, both CTAs with their help text, and **then** the photo as a cropped band (aspect 4:3, focused on the hands). The headline and both CTAs always come before the photo; the photo never pushes them down.

### 7.2 Typography hierarchy

1. **"Bridging the Gap."**: `display`, Zen Tokyo Zoo (loaded with next/font as `--font-display`; lowercase renders as small capitals; covers á é í ó ú ñ ü ¿ ¡ for the Spanish toggle). Breaks as "Bridging / the Gap." on desktop, where a gold arch runs from "Gap." to the image's edge.
2. **"Every Connection is a Step Forward."**: `h2` (24–32px), Raleway 600, `--primary-text` (soft blue), with a 32px gold rule before it on desktop.
3. **Supporting description:** "Real needs. Real people. Real connections." as a short lead line in Geist 600 with slightly wider tracking, then the sentence in `lead` at muted ivory, max width 34 rem, left aligned.
4. **CTAs.**

**Eyebrow:** "ROOTED IN CHICAGO · BUILT FOR CHANGE" as `eyebrow` text in ivory (navy in light mode) with a 24px gold hairline before it. No pill.

### 7.3 CTAs

- **Post a Need (primary):** blue fill, ivory/white text, 52px tall, arrow icon at the end. Hover: 2px lift, arrow moves 4px right, soft blue glow (`glow-primary`). Press: drops back, no glow. Focus: 3px ring with offset.
- **Offer Support (secondary):** 1px blue border, transparent fill, blue text, same arrow behavior; hover fills with 8% blue.
- Help text under each, as today. Destinations unchanged: `/sign-in?role=outreach` and `/sign-in?role=donor`.

### 7.4 Image implementation

`public/images/hero-bridge.png` (an illustration, 1448 × 1086), replacing the hands photo.
`next/image` with `loading="eager"` and `fetchPriority="high"` (Next.js 16 deprecated
`priority`), `fill` inside a fixed-aspect frame so nothing shifts while it loads: the full 4:3
image below 1024 px; from 1024 px text and image share the width 50/50 and the image is a 7:6
crop (`object-position: 5% 50%`), the widest crop that keeps the whole bridge (about 2%–86%
across) and both figures in view, close to the text column's height. No caption (it's clearly
an illustration). On desktop its top aligns with the eyebrow line. Alt text in `copy.ts`
(`HERO_IMAGE.alt`).

### 7.5 Motion (homepage)

| t (ms) | Element | Motion |
|---|---|---|
| 0 | Header | Already visible (no animation; it's navigation) |
| 0–240 | Eyebrow | fade + 8px rise |
| 80–400 | Headline | fade + 12px rise (per line, 60ms apart) |
| 200–480 | Secondary line | fade + 8px rise |
| 280–560 | Description | fade |
| 360–640 | CTAs | fade + 8px rise (clickable immediately; motion is cosmetic) |
| 200–700 | Photo | fade + scale from 1.03 to 1 (clip stays fixed, so no layout shift) |
| 500–1400 | Gold arch line | draws via `stroke-dashoffset` |
| On scroll | Sections below | `BlurFade` in view (existing), 8px rise |

Reduced motion: everything is shown immediately, the arch is complete, and there are no transforms. CSS only for the hero (no new JavaScript), using the existing `BlurFade` for sections.

### 7.6 Copy changes (to `src/lib/copy.ts`)

- **Replace** `HERO_LINE` with `HERO_LEAD` = "Real needs. Real people. Real connections." and `HERO_DESCRIPTION` = "The Bridge brings individuals, outreach teams, and organizations together to turn community needs into meaningful action."
- **Add** `HERO_IMAGE` = { alt: "Illustration of two people crossing a golden bridge over the Chicago River, with the city skyline behind them." }
- **Unchanged:** `HERO_BADGE`, `HERO_HEADLINE`, `ROLE_CTAS`, "How it works", "What is The Bridge?", Mission Statement (strings moved into `copy.ts` where they aren't already, wording identical).

---

## 8. Technical plan

### 8.1 Files by phase (expected)

| Phase | Files |
|---|---|
| 1 Foundation | `app/globals.css` (tokens, utilities), `components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`; new `components/page-header.tsx`, `section-header.tsx`, `empty-state.tsx`, `notice.tsx`; `lib/copy.ts` |
| 2 Homepage | new `components/brand/logo.tsx`, `brand/arch.tsx`, `components/cta-link.tsx`; `app/page.tsx`; `components/hero-glows.tsx` (replaced by the atmosphere layer); `site-header.tsx` (logo swap only); `app/layout.tsx` (theme color, metadata); new `app/icon.png`, `apple-icon.png`, `opengraph-image.png`; delete `brand/arched-wordmark.tsx`; `lib/copy.ts`; `docs/design-system.md` |
| 3 Navigation & auth | `site-header.tsx`, `header-nav.tsx`, `theme-toggle.tsx`, `app/sign-in/*` (styles only) |
| 4 Workflows | `components/request-card.tsx`, new `components/request-detail-layout.tsx`, `status-badge.tsx`, `category-badge.tsx`, `app/requests/new/*` (styles, copy moves), `app/dashboard/request-action-button.tsx` (styles, copy moves) |
| 5 Dashboards & admin | `app/dashboard/page.tsx`, `components/impact-stat.tsx`, `app/admin/*` (styles, copy moves) |
| 6 Chat | `components/assistant/assistant-chat.tsx` (styles only) |
| 7 Motion & polish | `components/brand/arch-loader.tsx`, loaders and empty states, final consistency |
| 8 QA | tests and docs only (fixes go back to the owning phase's files) |

### 8.2 Dependencies

**None planned.** Motion uses CSS, the existing `motion` package (`BlurFade`, `NumberTicker`), and `tw-animate-css`. Images use `next/image`. Icons come from `lucide-react`.

Logo outlining (D1) needs a one-time glyph-to-path step. Option A runs a script with `npx opentype.js` once, adding nothing to `package.json`. It needs your OK because it downloads a package and a font file (Poppins, Open Font License) for that one run. The output is static path data committed in `logo.tsx`.

### 8.3 Not changing

Database schema and migrations, API routes, server actions, auth behavior, roles and permissions, request and review rules, navigation destinations, assistant behavior, prompts, and chat logic.

### 8.4 Verification per phase

1. `npm run build`, `npm run lint`, `tsc --noEmit`.
2. `npm run test:claims` (on dev), `npm run test:assistant-reply`, `npm run test:redact`.
3. Browser checks (headless Chrome, as before) at 320, 390, 768, 1280, and 1440 px in light and dark:
   - horizontal overflow, clipping, and overlap
   - 44px targets and keyboard focus order
   - real-pixel contrast (≥ 4.5:1 text, ≥ 3:1 large text and controls)
   - reduced-motion behavior
   - console errors
4. The functional suites for each touched area: sign-in and create-account (36 checks), admin (33), contact visibility (32), chat panel (201), navigation (71).
5. Phase 2 extras:
   - layout shift measured with `PerformanceObserver` (target CLS < 0.02)
   - the hero image served as AVIF/WebP at the right size
   - the headline and both CTAs come before the photo at 320 and 390 px
   - logo colors and the "g" gap checked against both backgrounds and the photo
6. A summary per phase: files changed, components updated, tests run, tests not run, and remaining concerns.

**Prerequisite:** `.env.local` must point `DATABASE_URL` at the-bridge-dev before signed-in pages can be checked (it currently points at production).

---

## 9. Phased implementation (one commit per phase, then stop for review)

| Phase | Scope | Commit message |
|---|---|---|
| 1 | Design system foundation: tokens, type scale, glass/glow utilities, Button (loading), Card variants, Badge, form control consolidation, PageHeader, SectionHeader, EmptyState, Notice | `feat: design system foundation` |
| 2 | Homepage: SVG logo (header swap), favicon and social image, asymmetric hero, photo, typography, CTAs, arch draw-on, atmosphere, solid content cards, homepage motion, hero copy | `feat: editorial homepage and new logo` |
| 3 | Navigation and authentication: header polish, active states, phone menu, sign-in and create account | `feat: refine navigation and sign-in` |
| 4 | Core workflows: Post a Need form, RequestCard refactor, RequestDetailLayout pattern, action confirmations, Needs Board card states | `feat: request card and Post a Need redesign` |
| 5 | Dashboards and admin | `feat: dashboard and admin redesign` |
| 6 | Chat panel | `feat: chat panel redesign` |
| 7 | Motion and polish: ArchLoader, empty states, microinteractions, final consistency | `feat: motion, loader, and polish` |
| 8 | Application-wide QA: full matrix, fixes, final report | `chore: redesign QA` |

Each phase is pushed to `main` only after its checks pass.

**Status:** Phases 1–7 done; the homepage hero was later restructured (stacked and centered: the bridge illustration `new-bridge.png` (eager, full width up to 1024 px, then height capped at (100svh - 13rem) x 1.15), 4/8 px under the header; the line "Every Connection is a Step Forward." as the h1; then the lead, description and 40px buttons. The "Bridging the Gap." artwork (`hero-landing-image.png` in light mode, `hero-light-mode.png` in dark mode, lazy, full width below 1024 px, then 65% of the container up to 898 px) sits between How it works and "What is The Bridge?"; nothing between "What is The Bridge?" and the Mission Statement. The eyebrow closes the How it works section. The How it works, What is and Mission cards have 8px corners, a primary-blue border (`border-primary/45`) and a slight glow (`card-glow`, a drop-shadow of `--card-glow`); the Mission card keeps its gold left edge. Removed: the text headline, Zen Tokyo Zoo, the gold arch connector, the CTA helper text, the hero glow. Header logo 100/110/130 px). Before that (Phase 2's logo, hero image and headline font changed during review: see 3.1, 7.2 and 7.4). Phase 3: header 64 px from 640 px with a blue bar under the current link; solid phone menu; sign-in on the deeper background with the logo above one card, firmer tabs, and selectable account-type cards. Phase 4: RequestCard (badges, items and people as the title, where and when with icons, notes, a contact panel, a ruled footer for the action or a state note) and RequestDetailLayout (same parts; routed at `/requests/[id]`); confirmations on a quiet panel; Post a Need grouped into two sections with the action at the end. Phase 5: impact stats on the Card stat variant; admin tabs matching sign-in (3px indicator, firm baseline, tinted count on the current tab); review cards with a clearer field grid, quiet verification panel and ruled footer; review confirmations on the same quiet panel as request actions, errors as a Notice. Phase 6: chat bubbles with a tail corner (replies on the raised surface), the ArchLoader beside "Thinking…", the --scrim token, inline errors as a compact Notice, a tooltip on the chat button (hover and focus, 300 ms delay, Escape hides it) and a one-time "Ask a question" pill on phones. Phase 7: LoadingState (ArchLoader with status text) for page loading; empty states show the gradient arch drawing in once; buttons press down 2% (none with reduced motion); the branded 404 page (D5), the same for a missing page and a forbidden one.

Phase 1: Measured in Phase 1: the proposed `--subtle-foreground` was dropped (light `#566b7a` is only 4.34:1 on the muted fill), so metadata uses `--muted-foreground`; `--border-strong` was darkened from `#c9c0ab` / `#34506a` to `#8a8170` / `#557290` to reach 3:1 on the surfaces.

---

## 10. Decisions (decided before Phase 1)

| # | Decision | Recommendation (decided: D1 A, D2 keep sampled colors, with light-mode "Bridge" switchable to `#1f6fb5` by one token (`--logo-bridge`), D3 monogram, D4 keep, D5 yes in Phase 7, D6 removed, D7 done) |
|---|---|---|
| D1 | Logo letterforms: (A) outline glyphs to static SVG paths with a one-time `npx opentype.js` run (Poppins Bold, OFL, the closest match to the references), or (B) live SVG text in Raleway 800 (no download, looser match, depends on font loading) | **A** |
| D2 | Light-mode logo colors: keep the sampled `#199ef4` "Bridge" and the arch as-is (2.6:1 and 2.1:1 on ivory, logo-exempt), or deepen "Bridge" to `#1f6fb5` (4.7:1) and the arch's ends slightly | **Keep sampled colors** (faithful to your reference; logos are exempt), revisit after you see it |
| D3 | Favicon: arch + "B" monogram cropped from the dark logo (legible at 16–32 px), or the full wordmark (illegible at those sizes) | **Monogram** |
| D4 | States: keep "no red" (errors = strong text, border, icon) | **Keep** |
| D5 | Branded not-found page (arch mark, message, link home) | Include in Phase 7 if approved |
| D6 | Remove the unused `ui/border-beam.tsx` and `ui/dot-pattern.tsx` | Remove in Phase 1 |
| D7 | Fix `.env.local` (`DATABASE_URL` → the-bridge-dev) | Required before Phase 1 checks |
