"use client"

import { cn } from "@/lib/utils"
import { getRequestCompany } from "@/lib/userCompany"

export type CompanyFilterValue = "all" | "si_ware" | "buchi"

export function matchesCompanyFilter(
  request: { module?: string; requesterEmail?: string; companyId?: string },
  filter: CompanyFilterValue,
): boolean {
  if (filter === "all") return true
  return (request.companyId ?? getRequestCompany(request.module ?? "", request.requesterEmail)?.id) === filter
}

export function CompanyFilter({
  value,
  onChange,
  className,
}: {
  value: CompanyFilterValue
  onChange: (value: CompanyFilterValue) => void
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-semibold text-gray-600">Company:</span>
      {([
        ["all", "All Companies"],
        ["si_ware", "Si-Ware Systems"],
        ["buchi", "BUCHI"],
      ] as const).map(([option, label]) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "h-8 rounded-md border px-3 text-xs font-medium transition-all",
            value === option
              ? option === "buchi"
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-blue-700 bg-blue-700 text-white"
              : "border-gray-200 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
