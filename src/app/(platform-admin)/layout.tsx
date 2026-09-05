import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Shell } from "@/components/layout/Shell"
import { canAccessPath } from "@/lib/access"

export const runtime = "nodejs"

export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  const requestHeaders = await headers()
  const pathname = requestHeaders.get("x-pathname") ?? "/admin/users"

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(pathname)}`)
  }

  if (!canAccessPath(pathname, session.user.permissions, session.user.role)) {
    redirect(`/unauthorized?from=${encodeURIComponent(pathname)}`)
  }

  return <Shell portal="platform-admin">{children}</Shell>
}
