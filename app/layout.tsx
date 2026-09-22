import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tilly Tracker",
  description: "Gesundheit, Training und Alltag von Tilly im Blick",
};

export const viewport: Viewport = {
  themeColor: "#FBF7EE",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
