import fs from "fs"
import path from "path"
import { DEFAULTS, type PlatformSettings } from "@/app/(dashboard)/admin/settings/page"

const SETTINGS_PATH = path.join(process.cwd(), "data", "platform-settings.json")

export function loadSettingsServer(): PlatformSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return DEFAULTS
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8")
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function writeSettingsServer(settings: Partial<PlatformSettings>): void {
  const current = loadSettingsServer()
  const merged = { ...current, ...settings }
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8")
}
