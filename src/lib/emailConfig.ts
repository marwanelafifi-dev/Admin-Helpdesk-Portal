import fs from "fs"
import path from "path"

const CONFIG_PATH = path.join(process.cwd(), "data", "email-config.json")

export type EmailFunctionId = "admin" | "hr" | "finance"

export interface EmailConfig {
  method: string
  values: Record<string, string>
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
 * Falls back to the legacy single global account (pre-multi-account) for
 * any function that hasn't been configured yet under the new shape, so
 * existing deployments keep sending mail without re-entering credentials
 * until each function's account is set up from the GUI.
 */
export function readEmailConfig(functionId: EmailFunctionId = "admin"): EmailConfig | null {
  const store = readStore()
  if (!store) return null
  const account = store.accounts?.[functionId]
  if (account) return account
  if (store.method && store.values) return { method: store.method, values: store.values }
  return null
}

export function writeEmailConfig(functionId: EmailFunctionId, config: EmailConfig): void {
  const store = readStore() ?? {}
  const accounts = { ...(store.accounts ?? {}), [functionId]: config }
  writeStore({ accounts })
}
