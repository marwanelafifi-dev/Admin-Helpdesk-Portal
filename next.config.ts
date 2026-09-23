import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-parse", "remark-rehype", "unified", "bail", "is-plain-obj", "trough", "vfile", "vfile-message", "unist-util-stringify-position", "mdast-util-from-markdown", "mdast-util-to-hast", "micromark", "decode-named-character-reference", "character-entities", "property-information", "hast-util-whitespace", "space-separated-tokens", "comma-separated-tokens", "hast-util-to-jsx-runtime", "devlop"],
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
  skipTrailingSlashRedirect: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https:; upgrade-insecure-requests" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ]
  },
}

export default nextConfig
