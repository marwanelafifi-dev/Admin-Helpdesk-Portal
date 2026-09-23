import fs from "fs"
import path from "path"
import { DEFAULT_MAIN_APPS, DEFAULT_PLATFORM_SETTINGS, type PlatformSettings } from "@/lib/platformSettings"

const SETTINGS_PATH = path.join(process.cwd(), "data", "platform-settings.json")

export function loadSettingsServer(): PlatformSettings {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return DEFAULT_PLATFORM_SETTINGS
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8")
    const saved = JSON.parse(raw)
    return {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...saved,
      mainApps: Array.isArray(saved.mainApps)
        ? DEFAULT_MAIN_APPS.map((fallback, index) => ({ ...fallback, ...saved.mainApps[index], id: fallback.id }))
        : DEFAULT_MAIN_APPS,
    }
  } catch {
    return DEFAULT_PLATFORM_SETTINGS
  }
}

export function writeSettingsServer(settings: Partial<PlatformSettings>): void {
  const current = loadSettingsServer()
  const merged = { ...current, ...settings }
  const dir = path.dirname(SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf-8")
}
