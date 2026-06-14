import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["react-markdown", "remark-gfm", "remark-parse", "remark-rehype", "unified", "bail", "is-plain-obj", "trough", "vfile", "vfile-message", "unist-util-stringify-position", "mdast-util-from-markdown", "mdast-util-to-hast", "mdast-util-gfm", "mdast-util-gfm-autolink-literal", "mdast-util-gfm-footnote", "mdast-util-gfm-strikethrough", "mdast-util-gfm-table", "mdast-util-gfm-task-list-item", "mdast-util-find-and-replace", "micromark", "micromark-extension-gfm", "micromark-extension-gfm-autolink-literal", "micromark-extension-gfm-footnote", "micromark-extension-gfm-strikethrough", "micromark-extension-gfm-table", "micromark-extension-gfm-tagfilter", "micromark-extension-gfm-task-list-item", "micromark-util-combine-extensions", "decode-named-character-reference", "character-entities", "property-information", "hast-util-whitespace", "space-separated-tokens", "comma-separated-tokens", "hast-util-to-jsx-runtime", "devlop", "ccount", "escape-string-regexp"],
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
