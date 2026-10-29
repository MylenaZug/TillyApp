import { readFileSync } from "node:fs";
import withPWA from "@ducanh2912/next-pwa";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: version },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    // Sync-Eintraege laufen ueber die eigene Storage-Engine, nicht ueber den SW-Cache.
    exclude: [/^\/api\//],
  },
})(nextConfig);
