import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output:
    process.env.NEXT_OUTPUT_MODE === "standalone" ? "standalone" : undefined,
};

export default nextConfig;
