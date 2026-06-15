/**
 * Canonical status palette — keyed by the DISPLAYED label, not by the raw
 * underlying status code.
 *
 * Different modules use different codes for the same visible label
 * (e.g. shipping's `in_progress` and HR's `on_hold` both render as
 * "In Progress"). Coloring by code makes the same label appear in different
 * colors across rows, which is confusing. So we color by label instead, and
 * every page maps codes → labels → colors through this helper.
 *
 * To add a new status label: append to LABEL_COLORS + LABEL_DOTS here and
 * every list page picks it up automatically.
 */

export const LABEL_COLORS: Record<string, string> = {
  "New":               "bg-sky-50 text-sky-700",
  "In Progress":       "bg-blue-50 text-blue-700",
  "In Customs":        "bg-amber-50 text-amber-700",
  "In Transit":        "bg-blue-50 text-blue-700",
  // Legacy label — anything historically marked "On Hold" displays as
  // In Progress for visual consistency. The canonical label going
  // forward is "In Progress".
  "On Hold":           "bg-blue-50 text-blue-700",
  "Awaiting Approval": "bg-amber-50 text-amber-700",
  "Delivered":         "bg-green-50 text-green-700",
  "Completed":         "bg-emerald-50 text-emerald-700",
  "Cancelled":         "bg-red-50 text-red-600",
}

export const LABEL_DOTS: Record<string, string> = {
  "New":               "bg-sky-500",
  "In Progress":       "bg-blue-500",
  "In Customs":        "bg-amber-500",
  "In Transit":        "bg-blue-500",
  "On Hold":           "bg-blue-500",
  "Awaiting Approval": "bg-amber-500",
  "Delivered":         "bg-green-500",
  "Completed":         "bg-emerald-500",
  "Cancelled":         "bg-red-500",
}

/**
 * Active (selected/highlighted) pill style — used by stat-card / filter-pill
 * UIs where the chosen status fills the chip instead of using the soft
 * background.
 */
export const LABEL_PILL_ACTIVE: Record<string, string> = {
  "New":               "bg-sky-500 border-sky-500 text-white",
  "In Progress":       "bg-blue-600 border-blue-600 text-white",
  "In Customs":        "bg-amber-600 border-amber-600 text-white",
  "In Transit":        "bg-blue-600 border-blue-600 text-white",
  "On Hold":           "bg-blue-600 border-blue-600 text-white",
  "Awaiting Approval": "bg-amber-600 border-amber-600 text-white",
  "Delivered":         "bg-green-600 border-green-600 text-white",
  "Completed":         "bg-emerald-600 border-emerald-600 text-white",
  "Cancelled":         "bg-red-600 border-red-600 text-white",
}

/**
 * Build per-row { statusColors, statusDot } maps that resolve each underlying
 * status code through the module's label map to the canonical color.
 */
export function buildLabelDrivenMaps(
  moduleStatuses: readonly string[],
  moduleLabels: Record<string, string>,
): { statusColors: Record<string, string>; statusDot: Record<string, string> } {
  const statusColors: Record<string, string> = {}
  const statusDot: Record<string, string> = {}
  for (const code of moduleStatuses) {
    const label = moduleLabels[code] ?? code
    statusColors[code] = LABEL_COLORS[label] ?? "bg-zinc-100 text-zinc-600"
    statusDot[code] = LABEL_DOTS[label] ?? "bg-gray-400"
  }
  return { statusColors, statusDot }
}

/**
 * Look up the canonical color/dot for a single status code given the
 * module's label map. Useful when you want to color a span/badge directly
 * without going through InlineStatusSelect.
 */
export function colorForStatus(
  code: string,
  moduleLabels: Record<string, string>,
): { bgText: string; dot: string; label: string } {
  const label = moduleLabels[code] ?? code
  return {
    bgText: LABEL_COLORS[label] ?? "bg-zinc-100 text-zinc-600",
    dot: LABEL_DOTS[label] ?? "bg-gray-400",
    label,
  }
}
