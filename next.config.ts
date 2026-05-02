import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Native Node modules that must not be bundled by webpack
  serverExternalPackages: ["ssh2", "pdf-parse", "imapflow", "mailparser"],
};

export default nextConfig;
