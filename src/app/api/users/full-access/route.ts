import { NextResponse } from "next/server"
import { readUsers } from "@/lib/userStore"

export const runtime = "nodejs"

// Returns Full Access users for in-app notification delivery.
// These users are excluded from email queues (not a working queue)
// but should receive all in-app notifications.
export async function GET() {
  try {
    const users = readUsers()
      .filter((u) => u.active && u.role === "Full Access")
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image ?? null,
        role: u.role,
      }))

    return NextResponse.json({ data: users })
  } catch {
    return NextResponse.json({ data: [] })
  }
}
