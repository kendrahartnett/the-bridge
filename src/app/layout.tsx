import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Raleway } from "next/font/google";

import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headlines and titles only (the font-heading utility). Body text stays on Geist.
const raleway = Raleway({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Bridge",
  description:
    "Connecting Chicago outreach teams with organizations and neighbors ready to help, so people experiencing homelessness get essential resources and a path to more support.",
};

export const viewport: Viewport = {
  // Browser chrome matches the default (dark) page background.
  themeColor: "#020617",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes adds the theme class to <html> before React hydrates, so the
    // server and client markup differ on this one element by design.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${raleway.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
