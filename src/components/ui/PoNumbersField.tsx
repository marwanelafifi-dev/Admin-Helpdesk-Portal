"use client"

import { useState } from "react"
import { Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Add/remove list of PO number rows — one or many. Shared by any Finance form that needs a multi-PO field. */
export function PoNumbersField({ value, onChange, hasError }: { value: string[]; onChange: (v: string[]) => void; hasError?: boolean }) {
  const [draft, setDraft] = useState("")

  const addPo = () => {
    const trimmed = draft.trim()
    if (!trimmed) return
    if (!value.includes(trimmed)) onChange([...value, trimmed])
    setDraft("")
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="e.g. PO-10234"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); addPo() }
          }}
          className={cn(hasError && value.length === 0 && "border-red-400")}
        />
        <Button type="button" variant="outline" onClick={addPo}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((po, idx) => (
            <span key={`${po}-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {po}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="hover:bg-amber-100 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default PoNumbersField
