import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import { SITE } from "@/lib/site";
import { montserrat } from "./fonts";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Phones & gadgets in ${SITE.city}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Phones & gadgets in ${SITE.city}`,
    description: SITE.description,
    locale: "en_NG",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#156FBF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={montserrat.variable}>
      <body className="min-h-dvh bg-white text-brand-navy antialiased">
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
