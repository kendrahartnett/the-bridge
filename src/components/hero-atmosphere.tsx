/**
 * The hero's background: a deep-to-page gradient with one soft blue light behind the
 * headline and a faint gold warmth toward the photo. Decorative: hidden from assistive tech,
 * ignores the pointer, and clipped to its section (no horizontal scroll). Fades out at the
 * bottom so the section edge never shows as a line.
 */
export function HeroAtmosphere() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-linear-to-b from-background-deep to-background [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
    >
      <div className="absolute top-[-10rem] left-[-8rem] size-[34rem] rounded-full bg-primary/10 blur-3xl sm:size-[44rem] dark:bg-primary/15" />
      <div className="absolute right-[-6rem] bottom-[-8rem] size-[22rem] rounded-full bg-gold/6 blur-3xl sm:size-[30rem] dark:bg-gold/8" />
    </div>
  )
}
