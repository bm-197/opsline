import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@opsline/core", "@opsline/db"],
};

export default nextConfig;
