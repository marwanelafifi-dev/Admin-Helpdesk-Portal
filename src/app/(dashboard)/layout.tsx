import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
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
    <div className="flex h-screen overflow-hidden bg-background" suppressHydrationWarning>
      <ProductionDataWipe />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
