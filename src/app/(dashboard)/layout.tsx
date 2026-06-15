import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Shell } from "@/components/layout/Shell"
import { ProductionDataWipe } from "@/components/layout/ProductionDataWipe"
import { canAccessPath } from "@/lib/access"

export const runtime = "nodejs"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const requestHeaders = await headers()
  const pathname = requestHeaders.get("x-pathname") ?? "/dashboard"

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
  }

  if (!canAccessPath(pathname, session.user.permissions, session.user.role)) {
    redirect(`/unauthorized?from=${encodeURIComponent(pathname)}`)
  }

  return (
    <Shell>
      <ProductionDataWipe />
      {children}
    </Shell>
  )
}
