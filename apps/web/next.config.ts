import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@zeref/contracts", "@zeref/db"],
  experimental: {
    optimizePackageImports: ["@react-three/fiber", "@react-three/drei"],
  },
};

export default nextConfig;
