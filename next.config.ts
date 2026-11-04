import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["host.docker.internal"],
  images: { qualities: [90] },
};

export default nextConfig;
