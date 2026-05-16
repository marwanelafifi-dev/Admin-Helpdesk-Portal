let runtimeMaintenanceOverride: boolean | null = null

export function isMaintenanceModeEnabled() {
  if (runtimeMaintenanceOverride !== null) {
    return runtimeMaintenanceOverride
  }

  return process.env.MAINTENANCE_MODE === "true"
}

export function setMaintenanceModeOverride(enabled: boolean | null) {
  runtimeMaintenanceOverride = enabled
}

export function getMaintenanceModeState() {
  return {
    enabled: isMaintenanceModeEnabled(),
    source: runtimeMaintenanceOverride === null ? "env" : "runtime",
  } as const
}
