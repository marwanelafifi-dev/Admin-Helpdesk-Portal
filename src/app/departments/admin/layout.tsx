import { Shell } from "@/components/layout/Shell"
import { Suspense } from "react"

export default function AdminDepartmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Shell portal="admin">{children}</Shell>
    </Suspense>
  )
}
