import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next-dev",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["imapflow", "mailparser"],
  skipTrailingSlashRedirect: true,
}

export default nextConfig
