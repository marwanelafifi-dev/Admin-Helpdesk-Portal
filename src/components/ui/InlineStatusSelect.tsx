"use client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface StatusOption {
  value: string
  label: string
  colorClass?: string
  dotClass?: string
}

interface InlineStatusSelectProps {
  status: string
  options: StatusOption[]
  onChange: (value: string) => void
}

export function InlineStatusSelect({ status, options, onChange }: InlineStatusSelectProps) {
  const current = options.find((option) => option.value === status)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap border transition focus:outline-none focus:ring-2 focus:ring-blue-500",
            current?.colorClass ?? "bg-zinc-100 text-zinc-600 border-transparent"
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", current?.dotClass ?? "bg-gray-400")} />
          {current?.label ?? status}
          <ChevronDown className="h-3.5 w-3.5 text-current opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "justify-between",
              option.value === status ? "font-semibold" : ""
            )}
          >
            {option.label}
            {option.value === status ? "✓" : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
