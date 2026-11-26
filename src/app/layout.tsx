import type { Metadata, Viewport } from "next";
import "./fonts";
import "./globals.css";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "ធៀបអនឡាញ · Khmer Digital Invitations", template: "%s · ធៀបអនឡាញ" },
  description: "បង្កើតធៀបឌីជីថលបែបខ្មែរ ផ្ញើតំណផ្ទាល់ខ្លួនជូនភ្ញៀវ និងគ្រប់គ្រង RSVP · Beautiful Khmer digital invitations with personal guest links and RSVP.",
  openGraph: { type: "website", siteName: "ធៀបអនឡាញ · Theab Online" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#FAF9F6", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
