import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { copyFor } from "@/lib/copy";
import { LANGS } from "@/lib/i18n";
import { currentLang } from "@/lib/i18n-server";
import "../globals.css";
import { htmlClassName } from "../fonts";

// Every page exists once per language (app/[lang]); proxy.ts picks which one from the
// "lang" cookie without changing the address (see src/lib/i18n.ts).
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const c = copyFor(await currentLang());
  return { title: c.META.siteTitle, description: c.META.siteDescription };
}

export const viewport: Viewport = {
  // Browser chrome matches the default (dark) page background.
  themeColor: "#020617",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const lang = await currentLang();
  return (
    // next-themes adds the theme class to <html> before React hydrates, so the
    // server and client markup differ on this one element by design.
    <html
      lang={lang}
      suppressHydrationWarning
      className={htmlClassName}
    >
      <body className="min-h-full flex flex-col">
        <Providers lang={lang}>{children}</Providers>
      </body>
    </html>
  );
}
