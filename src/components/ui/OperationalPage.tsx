import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shared presentation rules for operational request queues.  Keeping the
 * header and status controls here prevents individual functions from
 * gradually adopting slightly different layouts.
 */
export function OperationalPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-700 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export type OperationalStatusCard = {
  key: string
  label: string
  value: number
  icon: LucideIcon
  iconBg: string
  iconColor: string
  activeBg: string
  activeBorder: string
}

export function OperationalStatusGrid({
  items,
  activeKey,
  onSelect,
}: {
  items: readonly OperationalStatusCard[]
  activeKey: string
  onSelect: (key: string) => void
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3", items.length > 6 ? "xl:grid-cols-7" : "xl:grid-cols-6")}>
      {items.map(({ key, label, value, icon: Icon, iconBg, iconColor, activeBg, activeBorder }) => {
        const isActive = activeKey === key
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            title={`Filter by ${label}`}
            className={cn(
              "group relative flex min-h-[92px] items-center gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              isActive
                ? `${activeBg} ${activeBorder} text-white shadow-md`
                : "border-slate-200 bg-white shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-900",
            )}
          >
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-all", isActive ? "bg-white/20" : iconBg)}>
              <Icon className={cn("h-5 w-5 transition-all", isActive ? "text-white" : iconColor)} />
            </div>
            <div className="min-w-0">
              <p className={cn("truncate text-sm font-medium", isActive ? "text-white/80" : "text-slate-500 dark:text-slate-400")}>{label}</p>
              <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", isActive ? "text-white" : "text-slate-950 dark:text-white")}>{value}</p>
            </div>
            {isActive && <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-white/90" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
