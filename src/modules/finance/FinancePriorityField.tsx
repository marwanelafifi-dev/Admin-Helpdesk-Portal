"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Gauge, Clock, Zap, Info, Check } from "lucide-react"
import { FINANCE_PRIORITIES, FINANCE_PRIORITY_SLA_DAYS, financeSlaNote, FINANCE_MISSING_DOCS_NOTE, type FinancePriority } from "./financeSla"

const PRIORITY_ICON: Record<FinancePriority, React.ElementType> = {
  Normal: Clock,
  Urgent: Zap,
}

const PRIORITY_THEME: Record<FinancePriority, { border: string; bg: string; text: string; icon: string; ring: string }> = {
  Normal: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-900", icon: "text-amber-600", ring: "ring-amber-200" },
  Urgent: { border: "border-red-500", bg: "bg-red-50", text: "text-red-900", icon: "text-red-600", ring: "ring-red-200" },
}

/**
 * Priority toggle (Normal / Urgent) shared by every Finance request form.
 * Shows the requester the SLA promise for the chosen priority, plus the
 * standing note about missing-documents delays.
 */
export function FinancePriorityField({ value, onChange, hasError }: { value?: FinancePriority; onChange: (v: FinancePriority) => void; hasError?: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100">
            <Gauge className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Priority</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">How urgent is this request?</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {FINANCE_PRIORITIES.map((p) => {
            const Icon = PRIORITY_ICON[p]
            const theme = PRIORITY_THEME[p]
            const isActive = value === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl border-2 px-4 py-3.5 font-medium transition-all",
                  isActive
                    ? cn(theme.border, theme.bg, theme.text, "shadow-sm ring-2", theme.ring)
                    : cn("border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50", hasError && !value && "border-red-300")
                )}
              >
                {isActive && (
                  <span className={cn("absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full", theme.bg)}>
                    <Check className={cn("h-3 w-3", theme.icon)} />
                  </span>
                )}
                <Icon className={cn("h-5 w-5", isActive ? theme.icon : "text-gray-400")} />
                <span className="text-sm font-semibold">{p}</span>
                <span className={cn("text-[11px]", isActive ? theme.text : "text-gray-400")}>
                  {FINANCE_PRIORITY_SLA_DAYS[p]} working days
                </span>
              </button>
            )
          })}
        </div>

        {value && (
          <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5", PRIORITY_THEME[value].border, PRIORITY_THEME[value].bg)}>
            <Clock className={cn("h-4 w-4 flex-shrink-0", PRIORITY_THEME[value].icon)} />
            <p className={cn("text-xs font-semibold", PRIORITY_THEME[value].text)}>{financeSlaNote(value)}</p>
          </div>
        )}

        <div className="flex items-start gap-2 border-t pt-3">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{FINANCE_MISSING_DOCS_NOTE}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default FinancePriorityField
