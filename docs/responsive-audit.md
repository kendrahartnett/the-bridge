# Small-screen responsiveness audit

## Before (2026-10-24)

Measured in headless Chrome with mobile emulation at 320, 360, 375, and 390px (dark mode; layout is identical in light mode), on a production build with the seeded test data. Pages: landing, sign-in (no role and Organization picked), outreach dashboard (test.outreach1), organization dashboard (test.donor1), /requests/new, both confirmation states (Offer support, Cancel), and the chat panel open on the landing page and the organization dashboard.

For every page and width the script checks:
- `document.documentElement.scrollWidth` against the viewport width.
- Every element wider than the viewport, or sticking out of it, by selector.
- Clipped text: text outside an ancestor that clips it, outside the viewport, or cut off by an ellipsis.
- Overlaps: text on text, text under a control it doesn't belong to, control on control, and the chat button while visible on top of a control.
- Tap targets under 44 × 44px.
- How specific items wrap: the hero headline and badge, the header row and wordmark, buttons, and contact emails.

### Overflow, clipping, overlap, and tap targets

| Page | 320px | 360px | 375px | 390px |
|---|---|---|---|---|
| landing | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, landing) | no overflow | no overflow | no overflow | no overflow |
| sign-in | no overflow | no overflow | no overflow | no overflow |
| sign-in (organization picked) | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard (Cancel confirm) | no overflow | no overflow | no overflow | no overflow |
| /requests/new | no overflow | no overflow | no overflow | no overflow |
| organization dashboard | no overflow | no overflow | no overflow | no overflow |
| org dashboard (Offer confirm) | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, org dashboard) | no overflow | no overflow | no overflow | no overflow |

40 page/width/theme combinations audited; 0 with any finding above. Console errors: 0.

- **Horizontal overflow: none.** `scrollWidth` equals the viewport width on every page at every width.
- **Elements wider than the viewport: none escape.** The only wide elements are two hero glow circles (`div.absolute.left-1/2.-translate-x-1/2`, `div.absolute.left-1/2.rounded-full`), contained by the glow layer's own `overflow-hidden`.
- **Clipped or overlapping text: none.** The chat button fades out over every control, as designed.
- **Tap targets under 44px: none.** The only matches were the 1 × 1px native `<select>` elements that Radix keeps hidden (`aria-hidden`) behind the Type and Neighborhood fields. They're not tappable.
- **Viewport meta:** `width=device-width, initial-scale=1`. Zoom isn't disabled.

### Findings to fix

| # | Where | Widths | What was measured | Proposed fix |
|---|---|---|---|---|
| 1 | Header on signed-in pages | 320 | The row (wordmark 120px + theme toggle + Sign out) ends at 310px, 6px into the 16px right padding. | Wordmark about 104px wide at the smallest size, and smaller gaps; tap targets stay 44px. |
| 2 | Hero headline, line 1 | 320 | "Bridging the Gap." wraps to 2 lines at 36px ("Bridging the / Gap."). | Fluid size: `clamp(1.75rem, 8vw, 3.75rem)` for line 1, one step smaller for line 2. |
| 3 | /requests/new: Type of support and Neighborhood selects | all | Trigger text is 14px (shadcn `text-sm`); the other fields are 16px. iPhones zoom in on fields under 16px. | 16px text on select triggers. |
| 4 | Landing: "What is The Bridge?" and Mission Statement cards | all | Card padding is 24px; the rule is p-4 below 640px. | p-4 on phones, the current padding from sm up. |
| 5 | Page side padding | all | px-4 at every size; nothing changes at sm and up. | px-4 on phones, sm:px-6 and up, on every page container. |
| 6 | Landing: "How it works" section | all | `overflow-x-clip` on the section, to contain the 1.1× hover zoom on the step cards (mouse only). Nothing overflows at rest. | Remove the section clip: the zoom stays inside the page padding at every width. Verify by hovering edge cards. |

### Already within the rules

- Hero badge: one line at 12px at every width (278px wide).
- Hero description: 16px, full width with side padding (288px at 320px).
- Call-to-action buttons: full width and stacked below 640px, each with its help text underneath.
- "How it works" steps: single column, 16px padding, 12px gap.
- Request cards: single column. Card action buttons are full width. Confirmation buttons stack on phones.
- Contact emails: one line, or two lines broken after the "@" (organization dashboard at 320px).
- Forms: every input and textarea is full width at 16px. Date and time fields stack. The privacy notice wraps cleanly.
- Chat panel: full-width bottom sheet. The input sits beside the Send button and is 16px. "How do organizations offer support?" wraps to two lines inside its button at 320px.
- Status and category badges: no overflow with the seeded content. Part 3 also tests very long item text, organization names, and emails.

## After (2026-10-24)

The same audit, rerun on the final build at 320, 360, 375, 390, 768, and 1280px, in light and dark mode (120 combinations).

### Horizontal overflow: `scrollWidth` = viewport width

Identical in light and dark mode.

| Page | 320px | 360px | 375px | 390px | 768px | 1280px |
|---|---|---|---|---|---|---|
| landing | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| chat panel (open, landing) | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| sign-in | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| sign-in (organization picked) | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| outreach dashboard | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| outreach dashboard (Cancel confirm) | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| /requests/new | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| organization dashboard | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| org dashboard (Offer confirm) | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |
| chat panel (open, org dashboard) | 320 = 320 | 360 = 360 | 375 = 375 | 390 = 390 | 768 = 768 | 1280 = 1280 |

**No page overflows at any width in either theme.** Before the fixes there was no overflow either (all 40 phone combinations); the fixes below were about wrapping, sizing, and spacing.

### Overflow, clipping, overlap, and tap targets


**light**

| Page | 320px | 360px | 375px | 390px | 768px | 1280px |
|---|---|---|---|---|---|---|
| landing | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, landing) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| sign-in | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| sign-in (organization picked) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard (Cancel confirm) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| /requests/new | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| organization dashboard | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| org dashboard (Offer confirm) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, org dashboard) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |

**dark**

| Page | 320px | 360px | 375px | 390px | 768px | 1280px |
|---|---|---|---|---|---|---|
| landing | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, landing) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| sign-in | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| sign-in (organization picked) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| outreach dashboard (Cancel confirm) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| /requests/new | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| organization dashboard | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| org dashboard (Offer confirm) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |
| chat panel (open, org dashboard) | no overflow | no overflow | no overflow | no overflow | no overflow | no overflow |

120 page/width/theme combinations audited; 0 with any finding above. Console errors: 0.

### Before and after, per finding

| # | Finding | Before | After |
|---|---|---|---|
| 1 | Signed-in header at 320px | Row ended at 310px (6px into the padding) | Wordmark 104px below 360px (120px from 360, 150px from 640); gaps reduced (gap-2, then gap-0.5 between the toggle and Sign out). Row ends at 304px; all three on one row; tap targets still 44px |
| 2 | Hero headline at 320px | Line 1 "Bridging the / Gap." on 2 lines at 36px | Line 1 `clamp(1.75rem, 8vw, 3.75rem)`, line 2 `clamp(1.5rem, 6.5vw, 3rem)`: line 1 is one line at every width (28px at 320 up to 60px at 768+), line 2 stays one step smaller (24px to 48px) |
| 3 | Select text on /requests/new | 14px | 16px on phones; 14px from md up, matching the text inputs |
| 4 | "What is The Bridge?" and Mission cards | 24px padding | 16px below 640px (gap-3 between paragraphs), 24px from sm up |
| 5 | Page side padding | px-4 at every size | px-4 on phones, sm:px-6 from 640px on every page container, the header, and the footer |
| 6 | "How it works" section clipping | `overflow-x-clip` on the section | Removed. Hover test with a real mouse over all 5 cards at 320, 360, 390, 414, 480, 600, 639, 640, 768, 1024, and 1280px: at 1.1× the zoom overflowed by 2px in the single-column layout (390–639px), so the scale is now 1.02× there and stays 1.1× from 640px up. No hover causes overflow at any width. The only clipping left is the hero glow layer's own `overflow-hidden` |

### Other changes from the rules

- Hero badge: `max-w-full`, centered text, so it can wrap to two centered lines if needed (it fits on one line at 12px even at 320px).
- Cards: `max-w-full min-w-0` on the shared Card, and `min-w-0` on dashboard grid items, so long unbroken text can't widen a grid column.
- Request cards: the status badge sits beside the title, and wraps onto its own line when there isn't room. Titles, contact names, notes, and the dashboard's organization line wrap long words (`overflow-wrap: anywhere`). Contact emails break after the "@" first.
- Wordmark SVG: `max-w-full`.
- Viewport meta unchanged: `width=device-width, initial-scale=1`, zoom allowed.

### Chat button fade, made exact

The chat panel checks (201) found 5 scroll positions where the chat button stayed visible while overlapping the edge of a control (for example "Offer Support" at 320px). It had been sampling 9 points on the button, so a sliver of overlap between points went unnoticed; the new layout moved controls into those gaps. It now compares its box with every control's box, so any overlap fades it out. After the change: 201 of 201 panel checks pass, including the bottom sheet at 320 and 360px (full width, max 85% of the screen height, input visible, 16px).

### Long-text test

Temporary data: two tagged requests with 200-character item text (including a 50-character unbroken word) and 300-character notes (including a 40-character reference code), one open and one supported, plus 120-character organization names on test.outreach1 and test.donor1. Contact emails were swapped in the browser for a 100-character address, because changing an account email would break sign-in. Both dashboards and both confirmation states were audited at all six widths in both themes: **48 of 48 clean** (no overflow, clipping, or overlap). Afterwards the two tagged requests were deleted and `npm run db:seed` restored the organization names; the database again holds exactly the 6 seeded requests.

### Tap targets and contrast

- Tap targets: no control under 44 × 44px on any page, width, or theme.
- Contrast (real pixels: text hidden, page photographed, every background pixel under each text box compared with the text color): every text element on every page passes at 320, 360, 375, 390, 768, and 1280px in light and dark mode. Lowest ratio: 5.36:1 (the hero badge). The floating chat button is hidden for this measurement, since it's an overlay that moves over text as the page scrolls.
