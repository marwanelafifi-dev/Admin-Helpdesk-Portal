"use client"

import { useState } from "react"
import { Plus, X, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

interface CcEmailsFieldProps {
  value: string[]
  onChange: (emails: string[]) => void
}

export function CcEmailsField({ value, onChange }: CcEmailsFieldProps) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function handleAdd() {
    const email = input.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) { setError("Invalid email address"); return }
    if (value.some((e) => e.toLowerCase() === email)) { setError("Already added"); return }
    onChange([...value, email])
    setInput("")
    setError("")
  }

  function handleRemove(email: string) {
    onChange(value.filter((e) => e !== email))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); handleAdd() }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="email"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError("") }}
          onKeyDown={handleKeyDown}
          placeholder="Add email address..."
          className={cn(
            "flex-1 rounded-md border bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
            error ? "border-red-400" : "border-gray-300"
          )}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700"
            >
              <Mail className="h-3 w-3 shrink-0" />
              {email}
              <button
                type="button"
                onClick={() => handleRemove(email)}
                className="rounded-full hover:bg-blue-100 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        These addresses will receive email notifications for all updates on this request.
      </p>
    </div>
  )
}
