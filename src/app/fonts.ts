import { Geist, Geist_Mono, Raleway } from "next/font/google"

// The site's fonts, shared by the root layout (app/[lang]/layout.tsx) and the 404 page
// (app/global-not-found.tsx), which renders its own document.

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Headlines and titles only (the font-heading utility). Body text stays on Geist.
const raleway = Raleway({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
})

/** The classes for <html>: the font variables and the base text settings. */
export const htmlClassName = `${geistSans.variable} ${geistMono.variable} ${raleway.variable} h-full antialiased`
