import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ធៀបអនឡាញ · Theab Online",
    short_name: "ធៀបអនឡាញ",
    description: "បង្កើតធៀបឌីជីថលបែបខ្មែរ ផ្ញើតំណផ្ទាល់ខ្លួនជូនភ្ញៀវ និងគ្រប់គ្រង RSVP",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF9F6",
    theme_color: "#B68A45",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
