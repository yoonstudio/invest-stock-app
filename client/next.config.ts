import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress multiple lockfile warning (monorepo structure)
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
