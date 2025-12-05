import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Next 16 warning when a webpack config exists by explicitly enabling turbopack.
  turbopack: {},
  webpack: (config) => {
    // Enable WASM so MediaPipe Tasks can load in the browser when using webpack.
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default nextConfig;
