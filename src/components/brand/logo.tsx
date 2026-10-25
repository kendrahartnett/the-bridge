import Image from "next/image"

import { cn } from "@/lib/utils"

import logoDark from "../../../public/brand/logo-dark.png"
import logoLight from "../../../public/brand/logo-light.png"

// The logo artwork (originals: design/source/new-dark-logo.png and new-light-logo.png), cleaned:
// the faint haze in the stripe gaps and stray specks removed, and cropped to the artwork.
// Both versions are in the page and CSS shows the one for the current theme, so switching
// themes never waits on a download.
const WIDTH = "w-[116px] min-[360px]:w-[128px] sm:w-[152px]"

/**
 * The Bridge logo. Decorative: the link around it carries the accessible name, so the
 * images have empty alt text. 116px wide below 360px, 128px on other phones, 152px from
 * 640px up: the smallest sizes at which all the stripes stay separate on 2x and 3x screens.
 * A larger logo (the sign-in page) passes its widths in className and matching `sizes`.
 */
export function Logo({ className, sizes = "(min-width: 640px) 152px, 128px" }: { className?: string; sizes?: string }) {
  const image = cn("block h-auto", WIDTH, className)
  return (
    <>
      <Image src={logoLight} alt="" sizes={sizes} loading="eager" className={cn(image, "dark:hidden")} />
      <Image src={logoDark} alt="" sizes={sizes} loading="eager" className={cn(image, "hidden dark:block")} />
    </>
  )
}
