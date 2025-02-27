import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  output: "standalone",
};

export default nextConfig;
