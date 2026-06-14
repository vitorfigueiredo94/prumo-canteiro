import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "better-sqlite3"],
  experimental: {
    forceSwcTransforms: false,
  },
};

export default nextConfig;
