import fs from "fs"
import path from "path"

const CONFIG_PATH = path.join(process.cwd(), "data", "email-config.json")

export type EmailFunctionId = "admin" | "hr" | "finance"

export interface EmailConfig {
  method: string
  values: Record<string, string>
}

export const FUNCTION_EMAILS: Record<EmailFunctionId, string> = {
  admin: "adminhelpdesk@si-ware.com",
  hr: "hr@si-ware.com",
  finance: "ap@si-ware.com",
}

const APP_PASSWORD_METHODS = new Set(["gmail_app_password", "smtp_relay"])

export function normalizeAppPassword(value: string): string {
  return value.replace(/\s/g, "")
}

function normalizeEmailConfig(functionId: EmailFunctionId, config: EmailConfig): EmailConfig {
  const values: Record<string, string> = { ...config.values }
  if (APP_PASSWORD_METHODS.has(config.method) && values.smtp_password) {
    values.smtp_password = normalizeAppPassword(values.smtp_password)
  }
  return { ...config, values }
}

interface StoredShape {
  accounts?: Partial<Record<EmailFunctionId, EmailConfig>>
  // Legacy single-account shape, from before per-function accounts existed.
  method?: string
  values?: Record<string, string>
}

function readStore(): StoredShape | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  } catch {
    return null
  }
}

function writeStore(store: StoredShape): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), "utf-8")
}

/**
 * Reads the saved SMTP/API account for one function (admin/hr/finance).
 * The legacy single global account is accepted for Administration only.
 * HR and Finance must each have their own saved account and App Password.
 */
export function readEmailConfig(functionId: EmailFunctionId = "admin"): EmailConfig | null {
  const store = readStore()
  if (!store) return null
  const account = store.accounts?.[functionId]
  if (account) return normalizeEmailConfig(functionId, account)
  if (functionId === "admin" && store.method && store.values) {
    return normalizeEmailConfig(functionId, { method: store.method, values: store.values })
  }
  return null
}

export function writeEmailConfig(functionId: EmailFunctionId, config: EmailConfig): void {
  const store = readStore() ?? {}
  const accounts = { ...(store.accounts ?? {}) }
  // Preserve and migrate the original single Administration account when
  // the first per-function configuration is saved.
  if (!accounts.admin && store.method && store.values) {
    accounts.admin = normalizeEmailConfig("admin", { method: store.method, values: store.values })
  }
  accounts[functionId] = normalizeEmailConfig(functionId, config)
  writeStore({ accounts })
}

/** Validate one function's independent Gmail/Workspace app password before saving. */
export function validateEmailConfig(functionId: EmailFunctionId, config: EmailConfig): string | null {
  if (!APP_PASSWORD_METHODS.has(config.method)) return null

  const email = (config.values.smtp_user ?? "").trim().toLowerCase()
  if (!email) {
    return "Sender email is required."
  }

  const password = normalizeAppPassword(config.values.smtp_password ?? "")
  if (!/^[A-Za-z0-9]{16}$/.test(password)) {
    return "App Password must contain exactly 16 letters or numbers. Spaces are allowed and removed automatically."
  }

  const store = readStore()
  if (functionId !== "admin" && store?.method && APP_PASSWORD_METHODS.has(store.method)) {
    const legacyPassword = normalizeAppPassword(store.values?.smtp_password ?? "")
    if (legacyPassword && legacyPassword === password) {
      return "This App Password is already used by Administration. Each function must use its own App Password."
    }
  }
  for (const [otherFunction, otherConfig] of Object.entries(store?.accounts ?? {})) {
    if (otherFunction === functionId || !otherConfig || !APP_PASSWORD_METHODS.has(otherConfig.method)) continue
    const otherPassword = normalizeAppPassword(otherConfig.values?.smtp_password ?? "")
    if (otherPassword && otherPassword === password) {
      return `This App Password is already used by ${otherFunction === "admin" ? "Administration" : otherFunction === "hr" ? "HR" : "Finance"}. Each function must use its own App Password.`
    }
  }

  return null
}
