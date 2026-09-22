import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
