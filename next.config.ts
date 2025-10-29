import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  experimental: {
    viewTransition: true,
    instrumentationHook: true,
  },
};

export default nextConfig;
