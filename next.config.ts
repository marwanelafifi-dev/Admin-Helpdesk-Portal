import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.ENABLE_GOOGLE_AUTH ?? "true",
  },
  distDir: ".next-dev",
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["imapflow", "mailparser"],
  experimental: {
    instrumentationHook: true,
  },
  skipTrailingSlashRedirect: true,
}

export default nextConfig
