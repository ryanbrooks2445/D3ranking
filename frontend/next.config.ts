import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      {
        source: "/ads.txt",
        destination: "https://srv.adstxtmanager.com/19390/d3rank.com",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
