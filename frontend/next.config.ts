import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Exclude public/data from serverless bundle (data loaded from GitHub Raw in prod)
  outputFileTracingExcludes: {
    "*": ["./public/data/**"],
  },
};

export default nextConfig;
