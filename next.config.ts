import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postgres.js uses Node net/tls/fs. Keep it out of the Turbopack/webpack
  // server bundle so `next build` and Vercel production succeed.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
