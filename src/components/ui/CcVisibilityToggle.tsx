"use client"

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Mail } from "lucide-react"

interface CcVisibilityToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function CcVisibilityToggle({ checked, onCheckedChange }: CcVisibilityToggleProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
      <Checkbox
        id="cc-visibility"
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="h-4 w-4"
      />
      <Label
        htmlFor="cc-visibility"
        className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 dark:text-slate-300"
      >
        <Mail className="h-4 w-4 text-blue-600" />
        Show requests I'm CC'd on
      </Label>
    </div>
  )
}
