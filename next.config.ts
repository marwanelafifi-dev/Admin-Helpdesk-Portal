import type { NextConfig } from "next"

// If you need to bypass TLS verification for a corporate proxy in local dev,
// set `ALLOW_INSECURE_TLS=1` in your environment (not committed).
if (process.env.ALLOW_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const isProd = process.env.NODE_ENV === "production"

const nextConfig: NextConfig = {
  // If you want to use standalone output for Docker, keep this.
  // Next.js 15+ will warn you to run `node .next/standalone/server.js` if you use `next start`.
  ...(isProd ? { output: "standalone" } : {}),
  // Ignore linting and TypeScript errors for build
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
