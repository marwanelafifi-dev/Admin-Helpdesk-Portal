import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  distDir: ".next-dev",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  skipTrailingSlashRedirect: true,
}

export default nextConfig
