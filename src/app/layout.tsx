import type { Metadata, Viewport } from "next";
import "./fonts";
import "./globals.css";
import { getLocale } from "@/i18n/server";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "ធៀបអនឡាញ · Khmer Digital Invitations", template: "%s · ធៀបអនឡាញ" },
  description: "បង្កើតធៀបឌីជីថលបែបខ្មែរ ផ្ញើតំណផ្ទាល់ខ្លួនជូនភ្ញៀវ និងគ្រប់គ្រង RSVP · Beautiful Khmer digital invitations with personal guest links and RSVP.",
  openGraph: { type: "website", siteName: "ធៀបអនឡាញ · Theab Online" },
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ធៀបអនឡាញ" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#FAF9F6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="min-h-dvh antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
