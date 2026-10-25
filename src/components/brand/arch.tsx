// The logo's gold arch as vector geometry, for the arch motif on the page (the hero
// connector). Fitted to the arch in design/source/new-dark-logo.png, in that image's
// coordinate space (2172 x 724). Its gold runs --arch-1 → --arch-2 → --arch-3, sampled from
// the logo in each theme.

/** The arch as a filled crescent: thick in the middle, tapering to points at both tips. */
export const ARCH_PATH = "M54 632.5C732.7 360.4 1411.3 398.4 2090 636C1411.3 438.4 732.7 420.7 54 632.5Z"

/** The crescent's centerline, for drawing the arch as a line (draw-on animation). */
export const ARCH_CENTERLINE = "M54 632.5C732.7 390.6 1411.3 418.4 2090 636"

/** A viewBox that frames the centerline (tips to crown), for stretching it across a space. */
export const ARCH_CENTERLINE_VIEWBOX = "54 455 2036 182"

/** Gradient stops along the arch: deeper gold at both ends, brightest at the crown. */
export const ARCH_STOPS = [
  { offset: 0, color: "var(--arch-1)" },
  { offset: 0.49, color: "var(--arch-2)" },
  { offset: 1, color: "var(--arch-3)" },
] as const
