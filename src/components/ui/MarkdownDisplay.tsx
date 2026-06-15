"use client"

import ReactMarkdown from "react-markdown"

interface Props {
  content: string
  className?: string
}

// Convert bare URLs in text to markdown links before rendering.
// This avoids needing remark-gfm (ESM-only, causes Next.js transpile issues).
function autoLinkUrls(text: string): string {
  // Don't double-link already-linked URLs (inside [](...))
  return text.replace(
    /(?<!\]\()(?<!["`])(https?:\/\/[^\s<>"')\]]+)/g,
    "[$1]($1)"
  )
}

export function MarkdownDisplay({ content, className = "" }: Props) {
  if (!content) return null
  return (
    <div className={`prose prose-sm max-w-none text-gray-700 dark:text-gray-300
      prose-headings:text-gray-900 dark:prose-headings:text-gray-100
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100
      prose-a:text-blue-600 prose-a:underline
      prose-ul:my-1 prose-ol:my-1 prose-li:my-0
      prose-p:my-1 prose-p:leading-relaxed
      prose-code:bg-gray-100 dark:prose-code:bg-slate-700 prose-code:px-1 prose-code:rounded prose-code:text-sm
      ${className}`}
    >
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800 break-all">
              {children}
            </a>
          ),
        }}
      >
        {autoLinkUrls(content)}
      </ReactMarkdown>
    </div>
  )
}
