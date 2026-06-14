"use client"

import { useRef, useState } from "react"
import { Bold, Italic, List, ListOrdered, Link, Heading2, Minus } from "lucide-react"
import { MarkdownDisplay } from "./MarkdownDisplay"

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  id?: string
}

type ToolbarAction =
  | { prefix: string; suffix: string; placeholder: string; block?: false }
  | { prefix: string; suffix: string; placeholder: string; block: true }

const TOOLBAR: { icon: React.ReactNode; title: string; action: ToolbarAction }[] = [
  {
    icon: <Bold className="h-3.5 w-3.5" />,
    title: "Bold",
    action: { prefix: "**", suffix: "**", placeholder: "bold text" },
  },
  {
    icon: <Italic className="h-3.5 w-3.5" />,
    title: "Italic",
    action: { prefix: "_", suffix: "_", placeholder: "italic text" },
  },
  {
    icon: <Heading2 className="h-3.5 w-3.5" />,
    title: "Heading",
    action: { prefix: "## ", suffix: "", placeholder: "Heading", block: true },
  },
  {
    icon: <List className="h-3.5 w-3.5" />,
    title: "Bullet list",
    action: { prefix: "- ", suffix: "", placeholder: "List item", block: true },
  },
  {
    icon: <ListOrdered className="h-3.5 w-3.5" />,
    title: "Numbered list",
    action: { prefix: "1. ", suffix: "", placeholder: "List item", block: true },
  },
  {
    icon: <Link className="h-3.5 w-3.5" />,
    title: "Link",
    action: { prefix: "[", suffix: "](url)", placeholder: "link text" },
  },
  {
    icon: <Minus className="h-3.5 w-3.5" />,
    title: "Divider",
    action: { prefix: "\n---\n", suffix: "", placeholder: "", block: true },
  },
]

export function MarkdownEditor({ value, onChange, placeholder, rows = 6, disabled, id }: Props) {
  const [preview, setPreview] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  function applyAction(action: ToolbarAction) {
    const el = ref.current
    if (!el) return
    const start = el.selectionStart
    const end   = el.selectionEnd
    const selected = value.slice(start, end) || action.placeholder

    let inserted: string
    let newCursor: number

    if (action.block) {
      // Block actions: insert on its own line
      const before = value.slice(0, start)
      const after  = value.slice(end)
      const needsNewlineBefore = before.length > 0 && !before.endsWith("\n")
      const prefix = (needsNewlineBefore ? "\n" : "") + action.prefix
      inserted = before + prefix + selected + action.suffix + after
      newCursor = before.length + prefix.length + selected.length + action.suffix.length
    } else {
      inserted = value.slice(0, start) + action.prefix + selected + action.suffix + value.slice(end)
      newCursor = start + action.prefix.length + selected.length + action.suffix.length
    }

    onChange(inserted)
    // Restore focus + cursor after React re-render
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

  return (
    <div className="rounded-md border border-input overflow-hidden focus-within:ring-1 focus-within:ring-ring">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 dark:bg-slate-800 border-b border-input">
        {TOOLBAR.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            disabled={disabled || preview}
            onClick={() => applyAction(t.action)}
            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-gray-300 disabled:opacity-40 transition-colors"
          >
            {t.icon}
          </button>
        ))}
        <div className="flex-1" />
        {/* Preview toggle */}
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className={`text-xs px-2 py-1 rounded transition-colors ${
            preview
              ? "bg-blue-600 text-white"
              : "text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-600"
          }`}
        >
          {preview ? "Edit" : "Preview"}
        </button>
      </div>

      {/* Editor / Preview area */}
      {preview ? (
        <div className="min-h-[120px] px-3 py-2 bg-white dark:bg-slate-900">
          {value ? (
            <MarkdownDisplay content={value} />
          ) : (
            <p className="text-sm text-gray-400 italic">Nothing to preview</p>
          )}
        </div>
      ) : (
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-900 resize-y focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
    </div>
  )
}
