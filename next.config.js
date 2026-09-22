import withPWA, { runtimeCaching } from "@ducanh2912/next-pwa";

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
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      ...runtimeCaching.filter((entry) => entry.options?.cacheName !== "apis"),
    ],
  },
  extendDefaultRuntimeCaching: false,
})(nextConfig);
