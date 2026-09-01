import { cn } from "@/lib/utils"
import { getRequestCompany } from "@/lib/userCompany"

type CompanyBadgeProps = {
  module: string
  requesterEmail?: string | null
  companyId?: "si_ware" | "buchi"
  companyName?: string
  className?: string
}

export function CompanyBadge({ module, requesterEmail, companyId, companyName, className }: CompanyBadgeProps) {
  const fallback = getRequestCompany(module, requesterEmail)
  const id = companyId ?? fallback?.id
  const name = companyName ?? fallback?.name ?? "Unclassified"

  return (
    <span className={cn(
      "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
      id === "buchi" ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800",
      className
    )}>
      {name}
    </span>
  )
}

