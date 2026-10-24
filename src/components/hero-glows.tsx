/**
 * Static ambient glows behind the hero headline and buttons. Purely decorative:
 * hidden from assistive tech, ignores the pointer, and clipped to its section so it
 * never causes horizontal scrolling. Light mode uses about half the dark-mode opacity.
 */
export function HeroGlows() {
  return (
    // The mask fades the glows out toward the bottom so the clip edge never shows as a line.
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_55%,transparent)]"
    >
      {/* Large blue glow behind the headline */}
      <div className="absolute top-[-8rem] left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl sm:size-[44rem] dark:bg-primary/20" />
      {/* Blue glow behind the buttons */}
      <div className="absolute bottom-[-10rem] left-1/2 size-[24rem] -translate-x-[70%] rounded-full bg-primary/8 blur-3xl sm:size-[32rem] dark:bg-primary/15" />
      {/* Smaller, fainter gold glow */}
      <div className="absolute right-[5%] bottom-[-6rem] size-[16rem] rounded-full bg-gold/4 blur-3xl sm:size-[22rem] dark:bg-gold/8" />
    </div>
  )
}
