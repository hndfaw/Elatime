import type { Metadata } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Friendly rounded display face for the logo + headings; clean readable body.
const display = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});
const body = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL to the deployed origin so OG/Twitter image URLs
// resolve absolutely; falls back to a sensible default for local/preview.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://elatime.vercel.app";
const description =
  "Elatime deploys scraping agents to monitor municipal sites, community boards, and venue schedules for toddler and kid-friendly activities, plotted on a custom interactive map. Anchored to Lee County, FL (Cape Coral + Fort Myers).";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Elatime — Kid-friendly events, mapped",
    template: "%s · Elatime",
  },
  description,
  applicationName: "Elatime",
  keywords: [
    "kid-friendly events",
    "toddler activities",
    "storytime",
    "Lee County",
    "Cape Coral",
    "Fort Myers",
    "family events",
  ],
  authors: [{ name: "Elatime" }],
  openGraph: {
    type: "website",
    siteName: "Elatime",
    title: "Elatime — Kid-friendly events, mapped",
    description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elatime — Kid-friendly events, mapped",
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
