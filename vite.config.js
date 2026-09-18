import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/TillyApp/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Tilly Tracker",
        short_name: "Tilly",
        description: "Gesundheit, Training und Alltag von Tilly im Blick",
        theme_color: "#FBF7EE",
        background_color: "#FBF7EE",
        display: "standalone",
        start_url: "/TillyApp/",
        scope: "/TillyApp/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      }
    })
  ]
});
