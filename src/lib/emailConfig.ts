import fs from "fs"
import path from "path"

const CONFIG_PATH = path.join(process.cwd(), "data", "email-config.json")

export interface EmailConfig {
  method: string
  values: Record<string, string>
}

export function readEmailConfig(): EmailConfig | null {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return null
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"))
  } catch {
    return null
  }
}

export function writeEmailConfig(config: EmailConfig): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8")
}
