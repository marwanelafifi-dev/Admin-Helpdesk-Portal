"use client"

interface NewItemsAlertProps {
  requestsCount?: number
  tasksCount?: number
  variant?: "icon" | "badge" | "inline"
  className?: string
}

// Disabled globally. The sidebar badges already communicate new-item
// counts; the in-header alert icon was redundant. Kept as a no-op so
// existing call sites continue to compile.
export function NewItemsAlert(_props: NewItemsAlertProps) {
  return null
}
