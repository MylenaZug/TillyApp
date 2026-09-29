import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Next.js-Komponenten importieren React nicht explizit (automatic JSX runtime).
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
