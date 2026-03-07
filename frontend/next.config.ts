import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Exclude public/data from serverless bundle (443 MB); data is loaded via fetch from static assets
    outputFileTracingExcludes: {
      "*": ["./public/data/**"],
    },
  },
};

export default nextConfig;
