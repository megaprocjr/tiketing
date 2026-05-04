import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma", "sharp", "bwip-js"],
};

export default nextConfig;
