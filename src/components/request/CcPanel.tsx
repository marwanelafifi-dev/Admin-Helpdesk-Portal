"use client"

import { useState } from "react"
import { X, Plus, Mail, Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface CcPanelProps {
  ccEmails: string[]        // from form payload (read-only display)
  adminCc: string[]         // admin-managed list (editable)
  onAdminCcChange: (emails: string[]) => void
  canEdit?: boolean         // only Admin/Super Admin
}

export function CcPanel({ ccEmails, adminCc, onAdminCcChange, canEdit = false }: CcPanelProps) {
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

  const allCc = Array.from(new Set([...ccEmails, ...adminCc]))

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function handleAdd() {
    const email = input.trim().toLowerCase()
    if (!email) return
    if (!isValidEmail(email)) {
      setError("Invalid email address")
      return
    }
    if (adminCc.some((e) => e.toLowerCase() === email)) {
      setError("Already in CC list")
      return
    }
    onAdminCcChange([...adminCc, email])
    setInput("")
    setError("")
  }

  function handleRemove(email: string) {
    // Only allow removing from adminCc, not from payload ccEmails
    onAdminCcChange(adminCc.filter((e) => e.toLowerCase() !== email.toLowerCase()))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  // Always render so users can add CC recipients

  return (
    <div className="border rounded-lg bg-gray-50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <Users className="h-4 w-4 text-blue-500" />
        CC Recipients
        <span className="ml-auto text-xs font-normal text-gray-400">
          Copied on all email updates for this request
        </span>
      </div>

      {/* CC list */}
      <div className="flex flex-wrap gap-2 min-h-[24px]">
        {allCc.length === 0 ? (
          <span className="text-xs text-gray-400 italic">No CC recipients added yet</span>
        ) : (
          allCc.map((email) => {
            const isAdminAdded = adminCc.some((e) => e.toLowerCase() === email.toLowerCase())
            const isFromForm = ccEmails.some((e) => e.toLowerCase() === email.toLowerCase())
            return (
              <span
                key={email}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                  isAdminAdded && !isFromForm
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-700"
                )}
              >
                <Mail className="h-3 w-3 shrink-0" />
                {email}
                {isFromForm && (
                  <span className="text-[10px] opacity-60 ml-0.5">(from form)</span>
                )}
                {canEdit && isAdminAdded && (
                  <button
                    onClick={() => handleRemove(email)}
                    className="ml-0.5 rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            )
          })
        )}
      </div>

      {/* Admin-only add input */}
      {canEdit && (
        <div className="space-y-1">
          <div className="flex gap-2">
            <input
              type="email"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError("") }}
              onKeyDown={handleKeyDown}
              placeholder="Add email to CC..."
              className={cn(
                "flex-1 rounded-md border bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500",
                error ? "border-red-400" : "border-gray-300"
              )}
            />
            <button
              onClick={handleAdd}
              disabled={!input.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
