import Image from "next/image"

import { cn } from "@/lib/utils"

import logoDark from "../../../public/brand/logo-dark.png"
import logoLight from "../../../public/brand/logo-light.png"

// The logo artwork (originals: design/source/new-dark-logo.png and new-light-logo.png), cleaned:
// the faint haze in the stripe gaps and stray specks removed, and cropped to the artwork.
// Both versions are in the page and CSS shows the one for the current theme, so switching
// themes never waits on a download.
const WIDTH = "w-[100px] min-[360px]:w-[110px] sm:w-[130px]"

/**
 * The Bridge logo. Decorative: the link around it carries the accessible name, so the
 * images have empty alt text. 100px wide below 360px, 110px on other phones, 130px from
 * 640px up. All stripes stay separate at these sizes, but on 2x screens they are softer than at
 * 128-152px (the gaps reach about a third of the way to the background); crisp on 3x screens.
 * A larger logo (the sign-in page) passes its widths in className and matching `sizes`.
 */
export function Logo({ className, sizes = "(min-width: 640px) 130px, 110px" }: { className?: string; sizes?: string }) {
  const image = cn("block h-auto", WIDTH, className)
  return (
    <>
      <Image src={logoLight} alt="" sizes={sizes} loading="eager" className={cn(image, "dark:hidden")} />
      <Image src={logoDark} alt="" sizes={sizes} loading="eager" className={cn(image, "hidden dark:block")} />
    </>
  )
}
