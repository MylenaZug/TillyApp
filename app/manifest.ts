import type { MetadataRoute } from "next";

// Ersetzt die vite-plugin-pwa Manifest-Config 1:1 (gleiche Werte/Farben/Icons).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tilly Tracker",
    short_name: "Tilly",
    description: "Gesundheit, Training und Alltag von Tilly im Blick",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FBF7EE",
    theme_color: "#FBF7EE",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
