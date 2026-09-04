import { Shell } from "@/components/layout/Shell"
import { Suspense } from "react"

export default function HRPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Shell portal="hr">{children}</Shell>
    </Suspense>
  )
}
