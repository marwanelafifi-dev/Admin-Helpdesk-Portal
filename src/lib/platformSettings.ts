export type MainAppIcon = "headset" | "monitor" | "globe" | "layout" | "building" | "users"
export type SupportFunctionId = "administration" | "people" | "finance" | "it"

export interface MainAppSettings {
  id: string
  name: string
  url: string
  icon: MainAppIcon
  iconImage: string
  enabled: boolean
}

export const DEFAULT_MAIN_APPS: MainAppSettings[] = [
  { id: "main-app-1", name: "IT Service Desk", url: "", icon: "headset", iconImage: "", enabled: true },
  { id: "main-app-2", name: "", url: "", icon: "layout", iconImage: "", enabled: false },
  { id: "main-app-3", name: "", url: "", icon: "globe", iconImage: "", enabled: false },
  { id: "main-app-4", name: "", url: "", icon: "monitor", iconImage: "", enabled: false },
  { id: "main-app-5", name: "", url: "", icon: "building", iconImage: "", enabled: false },
  { id: "main-app-6", name: "", url: "", icon: "users", iconImage: "", enabled: false },
  { id: "main-app-7", name: "", url: "", icon: "layout", iconImage: "", enabled: false },
  { id: "main-app-8", name: "", url: "", icon: "globe", iconImage: "", enabled: false },
  { id: "main-app-9", name: "", url: "", icon: "monitor", iconImage: "", enabled: false },
]

export interface PlatformSettings {
  platformName: string
  orgName: string
  supportEmail: string
  timezone: string
  dateFormat: string
  sessionTimeout: string
  enforcePasswordExpiry: boolean
  passwordExpiryDays: string
  requireStrongPasswords: boolean
  allowMultipleSessions: boolean
  loginTitle: string
  loginSubtitle: string
  loginCardTitle: string
  loginCardSubtitle: string
  loginFooterLine1: string
  loginFooterLine2: string
  loginFooterEmail: string
  showGoogleLogin: boolean
  sidebarBrandName: string
  sidebarBrandSubtitle: string
  headerShowLogo: boolean
  headerLogoAlt: string
  feedbackSurveyEnabled: boolean
  feedbackSurveySubject: string
  feedbackSurveyBody: string
  financeSlaWorkingDays: string
  financeSlaReminderDay: string
  itServiceDeskEnabled: boolean
  itServiceDeskUrl: string
  supportFunctionLogos: Record<SupportFunctionId, string>
  mainApps: MainAppSettings[]
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "Admin Helpdesk Portal",
  orgName: "Si-Ware Systems",
  supportEmail: "adminhelpdesk@si-ware.com",
  timezone: "Africa/Cairo",
  dateFormat: "DD-MMM-YYYY",
  sessionTimeout: "480",
  enforcePasswordExpiry: false,
  passwordExpiryDays: "90",
  requireStrongPasswords: true,
  allowMultipleSessions: true,
  loginTitle: "Si-Ware Company Portal",
  loginSubtitle: "Welcome to the Si-Ware Systems company portal. Sign in with your corporate credentials to access support functions and company services.",
  loginCardTitle: "Sign in securely",
  loginCardSubtitle: "Authorized Si-Ware Employees only.\nPlease use your corporate credentials to continue.",
  loginFooterLine1: "Si-Ware Systems Support Functions",
  loginFooterLine2: "For portal assistance, please contact the Administration Team.",
  loginFooterEmail: "adminhelpdesk@si-ware.com",
  showGoogleLogin: true,
  sidebarBrandName: "Admin Portal",
  sidebarBrandSubtitle: "Si-Ware Systems",
  headerShowLogo: true,
  headerLogoAlt: "Si-Ware Systems",
  feedbackSurveyEnabled: true,
  feedbackSurveySubject: "How was your {{module}} request? — {{requestTitle}}",
  feedbackSurveyBody: "Hi {{requesterName}},\n\nYour {{module}} request \"{{requestTitle}}\" has been completed.\n\nWe'd appreciate your feedback to help us improve our services. Please take a moment to rate your experience.",
  financeSlaWorkingDays: "4",
  financeSlaReminderDay: "3",
  itServiceDeskEnabled: true,
  itServiceDeskUrl: "",
  supportFunctionLogos: { administration: "", people: "", finance: "", it: "" },
  mainApps: DEFAULT_MAIN_APPS,
}
