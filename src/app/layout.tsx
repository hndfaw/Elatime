import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elatime — Kid-friendly events, mapped",
  description:
    "Elatime deploys scraping agents to monitor municipal sites, community boards, and venues for toddler and kid-friendly activities, plotted on an interactive map.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
