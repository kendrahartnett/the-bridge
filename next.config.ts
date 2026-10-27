import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Server Function arguments can include submitted need text. Keep them out of dev logs.
  logging: { serverFunctions: false },
  // app/global-not-found.tsx: the branded 404 page, server-rendered with a real 404 status
  // for every address that isn't a page (the root layout is under app/[lang]).
  experimental: {
    globalNotFound: true,
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
