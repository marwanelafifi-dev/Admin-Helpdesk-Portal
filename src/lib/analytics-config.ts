/**
 * Feature Configuration
 * Control which analytics features are enabled
 */

export const ANALYTICS_FEATURES = {
  // Main analytics page
  enabled: true,
  
  // Performance metrics (resolution time, on-time rate, etc.)
  performance: {
    enabled: true,
    refreshInterval: 300000, // 5 minutes
  },
  
  // Trends analysis (daily/monthly patterns)
  trends: {
    enabled: true,
    defaultDays: 90,
    refreshInterval: 600000, // 10 minutes
  },
  
  // Resource utilization (users, roles, load balancing)
  resources: {
    enabled: true,
    refreshInterval: 300000, // 5 minutes
  },
  
  // Module-specific performance analysis
  moduleAnalytics: {
    enabled: true,
    refreshInterval: 300000, // 5 minutes
  },
  
  // Export capabilities
  export: {
    csv: true,
    json: true,
    pdf: false, // Coming soon
  },
  
  // Predictions and forecasting
  predictions: {
    enabled: false, // Coming soon
    refreshInterval: 3600000, // 1 hour
  },
} as const

/**
 * Enhanced dashboard features
 */
export const DASHBOARD_ENHANCEMENTS = {
  // Additional KPIs beyond the defaults
  advancedKpis: {
    enabled: true,
    items: [
      "overdue_rate",
      "cancellation_reason_breakdown",
      "user_engagement_score",
      "module_health_score",
    ],
  },
  
  // Predictive insights
  insights: {
    enabled: false, // Coming soon
    types: ["bottleneck_detection", "capacity_planning", "anomaly_detection"],
  },
  
  // Drill-down capabilities
  drillDown: {
    enabled: true,
    levels: ["module", "status", "user", "date_range"],
  },
} as const

/**
 * Get feature flag for analytics
 */
export function isAnalyticsEnabled(feature?: keyof typeof ANALYTICS_FEATURES): boolean {
  if (!feature) return ANALYTICS_FEATURES.enabled
  
  const featureConfig = ANALYTICS_FEATURES[feature]
  
  // Handle boolean features
  if (typeof featureConfig === "boolean") return featureConfig
  
  // Handle object features with 'enabled' property
  if (typeof featureConfig === "object" && "enabled" in featureConfig) {
    return (featureConfig as any).enabled ?? false
  }
  
  // For export feature (no enabled property), consider it enabled
  if (feature === "export") return true
  
  return false
}

/**
 * Get refresh interval for a feature
 */
export function getRefreshInterval(
  feature: "performance" | "trends" | "resources" | "moduleAnalytics"
): number {
  return (ANALYTICS_FEATURES[feature] as any)?.refreshInterval ?? 300000
}
