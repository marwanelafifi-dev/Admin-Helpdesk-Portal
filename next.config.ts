import type { NextConfig } from "next"

// If you need to bypass TLS verification for a corporate proxy in local dev,
// set `ALLOW_INSECURE_TLS=1` in your environment (not committed).
if (process.env.ALLOW_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

const nextConfig: NextConfig = {
  distDir: ".next-dev",
}

export default nextConfig
