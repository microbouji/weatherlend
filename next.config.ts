import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately classic rendering: every page reads the demo-user cookie,
  // so nothing is prerendered or cached. (No CDN in front of a local
  // prototype; the follow-up can revisit this alongside real auth.)
  cacheComponents: false,
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
