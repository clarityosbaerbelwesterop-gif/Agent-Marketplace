import { Newsreader, Geist, Geist_Mono } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MarketplaceChrome } from "@/components/marketplace-chrome";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Agent Marketplace",
    template: "%s · Agent Marketplace",
  },
  description:
    "Mieten Sie spezialisierte KI-Agenten für eine Aufgabe — Marktplatz, Mietdauer und Chat.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#141210" },
  ],
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable}`}
    >
      <body className="flex min-h-screen flex-col antialiased">
        <MarketplaceChrome>
          <a
            href="#inhalt"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
          >
            Zum Inhalt
          </a>
          <SiteHeader />
        </MarketplaceChrome>
        <div id="inhalt" className="flex-1">
          {children}
        </div>
        <MarketplaceChrome>
          <SiteFooter />
        </MarketplaceChrome>
      </body>
    </html>
  );
}
