import { NextResponse } from "next/server"
import { z } from "zod"
import { getPrisma } from "@/server/engine/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { setCustomPermissions } from "@/lib/permissions.server"

const CustomPermissionSchema = z.object({
  permission: z.string().min(1),
  allowed: z.boolean(),
})

const UpdateCustomPermissionsSchema = z.object({
  customPermissions: z.array(CustomPermissionSchema),
})

async function getAuthorizedRole() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role
  if (!session?.user?.id || !role) return null
  return role
}

async function requireAdmin() {
  const role = await getAuthorizedRole()
  if (!role) return null
  if (!can(role, "adminPanel")) return null
  return role
}

export async function GET(req: Request) {
  const authorized = await requireAdmin()
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const pathname = new URL(req.url).pathname
  const segments = pathname.split("/").filter(Boolean)
  const userId = segments[segments.length - 2]
  if (!userId) {
    return NextResponse.json({ error: "User id missing from path" }, { status: 400 })
  }
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      customPermissions: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const authorized = await requireAdmin()
  if (!authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const pathname = new URL(req.url).pathname
  const segments = pathname.split("/").filter(Boolean)
  const userId = segments[segments.length - 2]
  if (!userId) {
    return NextResponse.json({ error: "User id missing from path" }, { status: 400 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = UpdateCustomPermissionsSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid customPermissions payload", details: parsed.error.flatten() }, { status: 400 })
  }

  const updatedUser = await setCustomPermissions(userId, parsed.data.customPermissions)
  return NextResponse.json({ id: updatedUser.id, customPermissions: updatedUser.customPermissions })
}
