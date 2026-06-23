import { NextResponse } from "next/server"
import { readMaintenanceState } from "@/lib/maintenanceMode"

export const runtime = "nodejs"

/**
 * GET /api/maintenance/scheduled — public endpoint that returns scheduled maintenance info.
 * No authentication required — shown to all users (authenticated + anonymous).
 * Used by the ScheduledMaintenanceBanner component on all pages.
 */
export async function GET() {
  try {
    const state = readMaintenanceState()
    // Only return the scheduled maintenance part (not the full state)
    return NextResponse.json({
      scheduledMaintenance: state.scheduledMaintenance || null,
    })
  } catch (error) {
    console.error("Failed to read scheduled maintenance:", error)
    return NextResponse.json(
      { scheduledMaintenance: null },
      { status: 200 } // Return 200 even on error so banner doesn't break
    )
  }
}
