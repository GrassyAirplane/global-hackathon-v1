import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:slug*",
        // destination: "https://sterlinggroup.ddns.net/api/:slug*"
        // destination: "http://backend:5000/api/:slug*"
        destination: "http://localhost:5000/api/:slug*"
      }
    ];
  }
};

export default nextConfig;
