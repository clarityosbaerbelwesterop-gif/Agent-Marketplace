import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postgres.js uses Node net/tls/perf_hooks; do not bundle it into the server graph.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;
