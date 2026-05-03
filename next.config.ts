import type { NextConfig } from "next"

// If you need to bypass TLS verification for a corporate proxy in local dev,
// set `ALLOW_INSECURE_TLS=1` in your environment (not committed).
if (process.env.ALLOW_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const isProd = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = {
  // Dev keeps a separate folder so local `.next` can be used for Docker/CI builds.
  distDir: isProd ? ".next" : ".next-dev",
  ...(isProd ? { output: "standalone" } : {}),
  // Ignore linting and TypeScript errors for build
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
