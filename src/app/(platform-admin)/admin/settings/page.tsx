"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Globe, Bell, Shield, Save, CheckCircle2, AlertTriangle,
  ExternalLink, Clock, Lock, RefreshCw, Key, LogIn, Layout, Monitor,
  Upload, Trash2, Star, AppWindow, Headset, Globe2, LayoutGrid, Building2, UsersRound,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DEFAULT_PLATFORM_SETTINGS, type MainAppIcon, type MainAppSettings, type PlatformSettings, type SupportFunctionId } from "@/lib/platformSettings"

export const HEADER_LOGO_KEY = "arp_logo_header"
export const LOGIN_LOGO_KEY = "arp_logo_login"

export const SETTINGS_KEY = "arp_platform_settings"

export type { PlatformSettings } from "@/lib/platformSettings"
export const DEFAULTS = DEFAULT_PLATFORM_SETTINGS

const TIMEZONES = [
  { value: "Africa/Cairo", label: "Cairo (GMT+2/+3)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Europe/London", label: "London (GMT+0/+1)" },
  { value: "America/New_York", label: "New York (GMT-5/-4)" },
  { value: "Asia/Riyadh", label: "Riyadh (GMT+3)" },
]

const DATE_FORMATS = [
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY (15-May-2026)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (15/05/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (05/15/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2026-05-15)" },
]

const MAIN_APP_ICON_OPTIONS: Array<{ value: MainAppIcon; label: string; icon: typeof Headset }> = [
  { value: "headset", label: "Support", icon: Headset }, { value: "monitor", label: "Computer", icon: Monitor }, { value: "globe", label: "Globe", icon: Globe2 },
  { value: "layout", label: "Grid", icon: LayoutGrid }, { value: "building", label: "Building", icon: Building2 }, { value: "users", label: "People", icon: UsersRound },
]
const SUPPORT_FUNCTION_OPTIONS: Array<{ id: SupportFunctionId; name: string; icon: typeof Headset }> = [
  { id: "administration", name: "Administration Team", icon: Building2 },
  { id: "people", name: "People Team", icon: UsersRound },
  { id: "finance", name: "Finance Team", icon: Globe2 },
  { id: "it", name: "IT Team", icon: Headset },
]

type SaveState = "idle" | "saving" | "saved" | "error"

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  )
}

function SaveButton({ state, onClick, label = "Save Changes" }: { state: SaveState; onClick: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <Button onClick={onClick} disabled={state === "saving"} className="bg-blue-600 hover:bg-blue-700 text-white">
        {state === "saving" ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
          : state === "saved" ? <><CheckCircle2 className="h-4 w-4 mr-2" />Saved</>
          : <><Save className="h-4 w-4 mr-2" />{label}</>}
      </Button>
      {state === "saved" && <span className="text-xs text-emerald-600 font-medium">Saved successfully.</span>}
      {state === "error" && <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Failed to save.</span>}
    </div>
  )
}

export function loadSettings(): PlatformSettings {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SETTINGS_KEY) : null
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {}
  return DEFAULTS
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS)
  const [generalSave, setGeneralSave] = useState<SaveState>("idle")
  const [securitySave, setSecuritySave] = useState<SaveState>("idle")
  const [loginSave, setLoginSave] = useState<SaveState>("idle")
  const [sidebarSave, setSidebarSave] = useState<SaveState>("idle")
  const [headerSave, setHeaderSave] = useState<SaveState>("idle")
  const [feedbackSave, setFeedbackSave] = useState<SaveState>("idle")
  const [financeSlaSave, setFinanceSlaSave] = useState<SaveState>("idle")
  const [mainAppsSave, setMainAppsSave] = useState<SaveState>("idle")
  const [mainAppIconUpload, setMainAppIconUpload] = useState<string | null>(null)
  const [mainAppIconUploadError, setMainAppIconUploadError] = useState<string | null>(null)
  const mainAppIconInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [supportLogoSave, setSupportLogoSave] = useState<SaveState>("idle")
  const [supportLogoUpload, setSupportLogoUpload] = useState<SupportFunctionId | null>(null)
  const supportLogoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [itTeamSave, setItTeamSave] = useState<SaveState>("idle")
  const [headerLogo, setHeaderLogo] = useState<string | null>(null)
  const [headerLogoSave, setHeaderLogoSave] = useState<SaveState>("idle")
  const headerLogoInputRef = useRef<HTMLInputElement>(null)
  const [loginLogo, setLoginLogo] = useState<string | null>(null)
  const [loginLogoSave, setLoginLogoSave] = useState<SaveState>("idle")
  const loginLogoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const local = loadSettings()
    setSettings(local)
    const hl = localStorage.getItem(HEADER_LOGO_KEY)
    if (hl) setHeaderLogo(hl)
    const ll = localStorage.getItem(LOGIN_LOGO_KEY)
    if (ll) setLoginLogo(ll)
    // Merge server-side settings shared by all users and server jobs.
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings) {
          setSettings((prev) => ({
            ...prev,
            feedbackSurveyEnabled: data.settings.feedbackSurveyEnabled ?? prev.feedbackSurveyEnabled,
            feedbackSurveySubject: data.settings.feedbackSurveySubject ?? prev.feedbackSurveySubject,
            feedbackSurveyBody:    data.settings.feedbackSurveyBody    ?? prev.feedbackSurveyBody,
            financeSlaWorkingDays: String(data.settings.financeSlaWorkingDays ?? prev.financeSlaWorkingDays),
            financeSlaReminderDay: String(data.settings.financeSlaReminderDay ?? prev.financeSlaReminderDay),
            itServiceDeskEnabled: data.settings.itServiceDeskEnabled ?? prev.itServiceDeskEnabled,
            itServiceDeskUrl: data.settings.itServiceDeskUrl ?? prev.itServiceDeskUrl,
            supportFunctionLogos: { ...prev.supportFunctionLogos, ...data.settings.supportFunctionLogos },
            mainApps: Array.isArray(data.settings.mainApps)
              ? DEFAULT_PLATFORM_SETTINGS.mainApps.map((fallback, index) => ({ ...fallback, ...data.settings.mainApps[index], id: fallback.id }))
              : prev.mainApps,
          }))
        }
      })
      .catch(() => {})
  }, [])

  function makeLogoUploadHandler(
    key: string,
    setter: (v: string | null) => void,
    setSave: (s: SaveState) => void,
    inputRef: React.RefObject<HTMLInputElement | null>,
  ) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (!file.type.startsWith("image/")) {
        setSave("error")
        setTimeout(() => setSave("idle"), 3000)
        return
      }
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        setter(dataUrl)
        localStorage.setItem(key, dataUrl)
        setSave("saved")
        setTimeout(() => setSave("idle"), 3000)
      }
      reader.readAsDataURL(file)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  function makeLogoResetHandler(
    key: string,
    setter: (v: string | null) => void,
    setSave: (s: SaveState) => void,
  ) {
    return () => {
      setter(null)
      localStorage.removeItem(key)
      setSave("saved")
      setTimeout(() => setSave("idle"), 3000)
    }
  }

  const handleHeaderLogoUpload = makeLogoUploadHandler(HEADER_LOGO_KEY, setHeaderLogo, setHeaderLogoSave, headerLogoInputRef)
  const handleHeaderLogoReset = makeLogoResetHandler(HEADER_LOGO_KEY, setHeaderLogo, setHeaderLogoSave)
  const handleLoginLogoUpload = makeLogoUploadHandler(LOGIN_LOGO_KEY, setLoginLogo, setLoginLogoSave, loginLogoInputRef)
  const handleLoginLogoReset = makeLogoResetHandler(LOGIN_LOGO_KEY, setLoginLogo, setLoginLogoSave)

  function set<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  function updateMainApp(index: number, patch: Partial<MainAppSettings>) {
    setSettings((prev) => ({
      ...prev,
      mainApps: prev.mainApps.map((app, appIndex) => appIndex === index ? { ...app, ...patch } : app),
    }))
  }

  async function handleMainAppIconUpload(index: number, appId: string, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setMainAppIconUploadError("Choose a PNG or JPG image up to 5 MB.")
      setMainAppsSave("error")
      setTimeout(() => setMainAppsSave("idle"), 3000)
      event.target.value = ""
      return
    }
    try {
      setMainAppIconUpload(appId)
      setMainAppIconUploadError(null)
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`/api/admin/main-app-icons/${appId}`, { method: "POST", body: formData })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error(payload.error || "Icon upload failed")
      updateMainApp(index, { iconImage: payload.url })
    } catch (error) {
      setMainAppIconUploadError(error instanceof Error ? error.message : "Icon upload failed.")
      setMainAppsSave("error")
      setTimeout(() => setMainAppsSave("idle"), 3000)
    } finally {
      setMainAppIconUpload(null)
    }
    event.target.value = ""
  }

  function persist(setSave: (s: SaveState) => void) {
    setSave("saving")
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setTimeout(() => setSave("saved"), 400)
      setTimeout(() => setSave("idle"), 3000)
    } catch {
      setSave("error")
      setTimeout(() => setSave("idle"), 3000)
    }
  }

  async function persistFeedback(setSave: (s: SaveState) => void) {
    setSave("saving")
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackSurveyEnabled: settings.feedbackSurveyEnabled,
          feedbackSurveySubject: settings.feedbackSurveySubject,
          feedbackSurveyBody: settings.feedbackSurveyBody,
        }),
      })
      setTimeout(() => setSave("saved"), 400)
      setTimeout(() => setSave("idle"), 3000)
    } catch {
      setSave("error")
      setTimeout(() => setSave("idle"), 3000)
    }
  }

  async function persistFinanceSla() {
    const slaDays = Number.parseInt(settings.financeSlaWorkingDays, 10)
    const reminderDay = Number.parseInt(settings.financeSlaReminderDay, 10)
    if (!Number.isInteger(slaDays) || slaDays < 2 || slaDays > 60 || !Number.isInteger(reminderDay) || reminderDay < 1 || reminderDay >= slaDays) {
      setFinanceSlaSave("error")
      setTimeout(() => setFinanceSlaSave("idle"), 3000)
      return
    }

    setFinanceSlaSave("saving")
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          financeSlaWorkingDays: String(slaDays),
          financeSlaReminderDay: String(reminderDay),
        }),
      })
      if (!response.ok) throw new Error("Failed to save Finance SLA settings")
      setFinanceSlaSave("saved")
      setTimeout(() => setFinanceSlaSave("idle"), 3000)
    } catch {
      setFinanceSlaSave("error")
      setTimeout(() => setFinanceSlaSave("idle"), 3000)
    }
  }

  async function persistMainApps() {
    setMainAppsSave("saving")
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mainApps: settings.mainApps }),
      })
      if (!response.ok) throw new Error("Failed to save Main Apps")
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setMainAppsSave("saved")
      setTimeout(() => setMainAppsSave("idle"), 3000)
    } catch {
      setMainAppsSave("error")
      setTimeout(() => setMainAppsSave("idle"), 3000)
    }
  }

  async function handleSupportLogoUpload(id: SupportFunctionId, event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file || !/^image\/(png|jpeg)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setSupportLogoSave("error")
      setTimeout(() => setSupportLogoSave("idle"), 3000)
      return
    }
    try {
      setSupportLogoUpload(id)
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`/api/admin/support-function-icons/${id}`, { method: "POST", body: formData })
      const payload = await response.json()
      if (!response.ok || !payload.url) throw new Error("Upload failed")
      const supportFunctionLogos = { ...settings.supportFunctionLogos, [id]: payload.url }
      setSettings((previous) => ({ ...previous, supportFunctionLogos }))
      const saveResponse = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ supportFunctionLogos }) })
      if (!saveResponse.ok) throw new Error("Save failed")
      setSupportLogoSave("saved")
      setTimeout(() => setSupportLogoSave("idle"), 3000)
    } catch {
      setSupportLogoSave("error")
      setTimeout(() => setSupportLogoSave("idle"), 3000)
    } finally {
      setSupportLogoUpload(null)
    }
  }

  async function persistItTeam() {
    setItTeamSave("saving")
    try {
      const response = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itServiceDeskEnabled: settings.itServiceDeskEnabled, itServiceDeskUrl: settings.itServiceDeskUrl }) })
      if (!response.ok) throw new Error("Failed to save IT Team settings")
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      setItTeamSave("saved")
      setTimeout(() => setItTeamSave("idle"), 3000)
    } catch {
      setItTeamSave("error")
      setTimeout(() => setItTeamSave("idle"), 3000)
    }
  }

  function resetToDefaults() {
    setSettings(DEFAULTS)
    localStorage.removeItem(SETTINGS_KEY)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide configuration and preferences</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetToDefaults} className="text-gray-600">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Reset to Defaults
        </Button>
      </div>

      {/* ── General ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-lg p-2"><Globe className="h-4 w-4 text-blue-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">General</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Basic platform information and regional settings</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Platform Name</Label>
              <Input value={settings.platformName} onChange={(e) => set("platformName", e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Organization Name</Label>
              <Input value={settings.orgName} onChange={(e) => set("orgName", e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Support Email</Label>
            <Input type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} className="text-sm" />
            <p className="text-xs text-gray-400">Displayed in system emails and notifications</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Timezone</Label>
              <select value={settings.timezone} onChange={(e) => set("timezone", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {TIMEZONES.map((tz) => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Date Format</Label>
              <select value={settings.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {DATE_FORMATS.map((df) => <option key={df.value} value={df.value}>{df.label}</option>)}
              </select>
            </div>
          </div>
          <SaveButton state={generalSave} onClick={() => persist(setGeneralSave)} />
        </CardContent>
      </Card>

      {/* ── Finance SLA ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-lg p-2"><Clock className="h-4 w-4 text-amber-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Finance Team SLA</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Configure the processing target and automatic reminder timing for Finance requests</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">SLA Working Days</Label>
              <Input
                type="number"
                min="2"
                max="60"
                step="1"
                value={settings.financeSlaWorkingDays}
                onChange={(e) => set("financeSlaWorkingDays", e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-gray-400">Shown in all Finance request forms and used to calculate the deadline.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">SLA Reminder Day</Label>
              <Input
                type="number"
                min="1"
                max={Math.max(1, Number.parseInt(settings.financeSlaWorkingDays, 10) - 1 || 1)}
                step="1"
                value={settings.financeSlaReminderDay}
                onChange={(e) => set("financeSlaReminderDay", e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-gray-400">The working day on which Finance Team members receive the reminder.</p>
            </div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Current policy: requests are due within <strong>{settings.financeSlaWorkingDays || "—"} working days</strong>; the reminder is sent on working day <strong>{settings.financeSlaReminderDay || "—"}</strong>.
          </div>
          <p className="text-xs text-gray-500">The reminder day must be at least 1 and earlier than the SLA deadline.</p>
          <SaveButton state={financeSlaSave} onClick={persistFinanceSla} label="Save Finance SLA" />
        </CardContent>
      </Card>

      {/* ── IT Service Desk ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg"><div className="flex items-center gap-2"><div className="bg-violet-100 rounded-lg p-2"><ExternalLink className="h-4 w-4 text-violet-700" /></div><div><CardTitle className="text-base font-semibold text-gray-900">IT Team</CardTitle><p className="text-xs text-gray-500 mt-0.5">Configure the Service Desk link shown in Support Functions</p></div></div></CardHeader>
        <CardContent className="p-6 space-y-5"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-800">Show IT Team</p><p className="text-xs text-gray-500 mt-0.5">Users open this link to submit IT incidents and service requests.</p></div><Toggle checked={settings.itServiceDeskEnabled} onChange={(itServiceDeskEnabled) => set("itServiceDeskEnabled", itServiceDeskEnabled)} /></div><div className="space-y-1.5"><Label className="text-sm font-medium text-gray-700">Service Desk URL</Label><Input type="url" value={settings.itServiceDeskUrl} onChange={(e) => set("itServiceDeskUrl", e.target.value)} disabled={!settings.itServiceDeskEnabled} placeholder="https://your-company.samanage.com" /><p className="text-xs text-gray-400">Use a full HTTP or HTTPS URL.</p></div><SaveButton state={itTeamSave} onClick={persistItTeam} label="Save IT Team Link" /></CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-violet-100 rounded-lg p-2"><AppWindow className="h-4 w-4 text-violet-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Main Apps</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Add up to nine external applications to the Company Portal landing page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Enabled apps appear below Support Functions. Give each app a clear name, a full HTTP or HTTPS URL, then select an icon or upload its PNG/JPG image for the landing page.</p>
          {settings.mainApps.map((app, index) => (
            <div key={app.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-[#263d8b]">{(() => { const Icon = MAIN_APP_ICON_OPTIONS.find((option) => option.value === app.icon)?.icon ?? Monitor; return <Icon className="h-4 w-4" /> })()}</span><p className="text-sm font-semibold text-gray-800">App {index + 1}</p></div><div className="flex items-center gap-2"><span className="text-xs text-gray-500">Show on landing page</span><Toggle checked={app.enabled} onChange={(enabled) => updateMainApp(index, { enabled })} /></div></div>
              <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_13rem]">
                <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-600">Name</Label><Input value={app.name} onChange={(e) => updateMainApp(index, { name: e.target.value })} placeholder="e.g. HR System" disabled={!app.enabled} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-600">Link</Label><Input type="url" value={app.url} onChange={(e) => updateMainApp(index, { url: e.target.value })} placeholder="https://app.example.com" disabled={!app.enabled} /></div>
                <div className="space-y-1.5"><Label className="text-xs font-medium text-gray-600">Landing page icon</Label><div className="grid grid-cols-3 gap-1.5">{MAIN_APP_ICON_OPTIONS.map((option) => { const Icon = option.icon; const selected = !app.iconImage && app.icon === option.value; return <button key={option.value} type="button" title={option.label} aria-label={`Use ${option.label} icon`} disabled={!app.enabled} onClick={() => updateMainApp(index, { icon: option.value, iconImage: "" })} className={`flex h-10 items-center justify-center rounded-md border transition ${selected ? "border-[#263d8b] bg-[#eef3ff] text-[#263d8b] shadow-sm" : "border-gray-200 bg-white text-gray-500 hover:border-cyan-300 hover:text-[#263d8b]"} disabled:cursor-not-allowed disabled:opacity-40`}><Icon className="h-4 w-4" /></button> })}</div><div className="flex items-center gap-2 pt-1"><input ref={(element) => { mainAppIconInputRefs.current[app.id] = element }} id={`main-app-icon-${app.id}`} type="file" accept="image/png,image/jpeg" className="sr-only" disabled={!app.enabled || mainAppIconUpload === app.id} onChange={(event) => handleMainAppIconUpload(index, app.id, event)} /><button type="button" disabled={!app.enabled || mainAppIconUpload === app.id} onClick={() => mainAppIconInputRefs.current[app.id]?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-2.5 text-xs font-semibold text-[#263d8b] transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{mainAppIconUpload === app.id ? "Uploading..." : "Upload PNG/JPG"}</button>{app.iconImage && <><img src={app.iconImage} alt="Custom app icon preview" className="h-9 w-9 rounded-md border border-gray-200 object-contain p-0.5" /><button type="button" onClick={() => updateMainApp(index, { iconImage: "" })} className="text-xs font-semibold text-red-600 hover:text-red-700">Remove</button></>}</div><p className={`text-[11px] leading-4 ${mainAppIconUploadError ? "text-red-600" : "text-gray-400"}`}>{mainAppIconUploadError || "PNG or JPG up to 5 MB. Saved securely as an app asset."}</p></div>
              </div>
            </div>
          ))}
          <SaveButton state={mainAppsSave} onClick={persistMainApps} label="Save Main Apps" />
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg"><div className="flex items-center gap-2"><div className="bg-cyan-100 rounded-lg p-2"><AppWindow className="h-4 w-4 text-[#263d8b]" /></div><div><CardTitle className="text-base font-semibold text-gray-900">Support Function Logos</CardTitle><p className="text-xs text-gray-500 mt-0.5">Upload the logos shown on the Support Functions cards</p></div></div></CardHeader>
        <CardContent className="p-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{SUPPORT_FUNCTION_OPTIONS.map((option) => { const Icon = option.icon; const logo = settings.supportFunctionLogos[option.id]; return <div key={option.id} className="rounded-xl border border-gray-200 bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-cyan-200 bg-cyan-50 text-[#263d8b]">{logo ? <img src={logo} alt="" className="h-full w-full object-contain p-1" /> : <Icon className="h-5 w-5" />}</span><p className="text-sm font-semibold text-gray-800">{option.name}</p></div><input ref={(element) => { supportLogoInputRefs.current[option.id] = element }} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => handleSupportLogoUpload(option.id, event)} /><div className="mt-4 flex items-center gap-2"><button type="button" onClick={() => supportLogoInputRefs.current[option.id]?.click()} disabled={supportLogoUpload === option.id} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-2.5 text-xs font-semibold text-[#263d8b] hover:bg-cyan-100 disabled:opacity-50"><Upload className="h-3.5 w-3.5" />{supportLogoUpload === option.id ? "Uploading..." : "Upload logo"}</button>{logo && <button type="button" onClick={() => setSettings((previous) => ({ ...previous, supportFunctionLogos: { ...previous.supportFunctionLogos, [option.id]: "" } }))} className="text-xs font-semibold text-red-600">Remove</button>}</div></div>})}</div>{supportLogoSave === "error" && <p className="mt-3 text-xs font-medium text-red-600">Logo upload failed. Use a PNG or JPG image up to 5 MB.</p>}{supportLogoSave === "saved" && <p className="mt-3 text-xs font-medium text-emerald-600">Support Function logo saved.</p>}</CardContent>
      </Card>

      {/* ── Login Page ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 rounded-lg p-2"><LogIn className="h-4 w-4 text-indigo-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Login Page</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Customize the text and content shown on the sign-in page</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">

          {/* Login Logo upload */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Login Page Logo</Label>
            <div className="flex items-start gap-5">
              <div
                className="relative h-20 w-44 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors group"
                onClick={() => loginLogoInputRef.current?.click()}
                title="Click to upload a login logo"
              >
                <img src={loginLogo ?? "/siware-logo.png"} alt="Login logo preview" className="h-full w-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 rounded-xl">
                  <Upload className="h-5 w-5 text-white" />
                  <span className="text-white text-xs font-medium">Replace</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <p className="text-sm font-medium text-gray-700">{loginLogo ? "Custom logo active" : "Default Si-Ware logo"}</p>
                <p className="text-xs text-gray-500">{loginLogo ? "Your uploaded logo is shown on the login page." : "Upload your own logo for the login page."}</p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => loginLogoInputRef.current?.click()} className="text-xs">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />{loginLogo ? "Upload New" : "Upload Logo"}
                  </Button>
                  {loginLogo && (
                    <Button type="button" variant="outline" size="sm" onClick={handleLoginLogoReset} className="text-xs border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Restore Default
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP · recommended 200×80px</p>
                {loginLogoSave === "saved" && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Login logo updated.</p>}
                {loginLogoSave === "error" && <p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Please upload a valid image file.</p>}
              </div>
            </div>
            <input ref={loginLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLoginLogoUpload} />
          </div>

          <div className="border-t pt-4 space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Page Title</Label>
            <Input value={settings.loginTitle} onChange={(e) => set("loginTitle", e.target.value)} className="text-sm" placeholder="Admin Helpdesk Portal" />
            <p className="text-xs text-gray-400">Large heading shown above the sign-in card</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Page Subtitle</Label>
            <textarea
              value={settings.loginSubtitle}
              onChange={(e) => set("loginSubtitle", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Welcome message below the title..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Card Title</Label>
              <Input value={settings.loginCardTitle} onChange={(e) => set("loginCardTitle", e.target.value)} className="text-sm" placeholder="Sign in securely" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Card Subtitle</Label>
              <Input value={settings.loginCardSubtitle} onChange={(e) => set("loginCardSubtitle", e.target.value)} className="text-sm" placeholder="Authorized employees only." />
            </div>
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Footer Text</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Footer Line 1</Label>
                <Input value={settings.loginFooterLine1} onChange={(e) => set("loginFooterLine1", e.target.value)} className="text-sm" placeholder="Operated by IT Team" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Footer Line 2</Label>
                <Input value={settings.loginFooterLine2} onChange={(e) => set("loginFooterLine2", e.target.value)} className="text-sm" placeholder="For assistance, please contact..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Footer Email</Label>
              <Input type="email" value={settings.loginFooterEmail} onChange={(e) => set("loginFooterEmail", e.target.value)} className="text-sm" placeholder="ithelpdesk@si-ware.com" />
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="text-sm font-medium text-gray-800">Show "Continue with Google" button</p>
              <p className="text-xs text-gray-500 mt-0.5">Show or hide the Google OAuth login option</p>
            </div>
            <Toggle checked={settings.showGoogleLogin} onChange={(v) => set("showGoogleLogin", v)} />
          </div>
          <SaveButton state={loginSave} onClick={() => persist(setLoginSave)} label="Save Login Settings" />
        </CardContent>
      </Card>

      {/* ── Sidebar ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-slate-100 rounded-lg p-2"><Layout className="h-4 w-4 text-slate-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Sidebar</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Brand name and label displayed in the navigation sidebar</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Brand Name</Label>
              <Input value={settings.sidebarBrandName} onChange={(e) => set("sidebarBrandName", e.target.value)} className="text-sm" placeholder="Admin Portal" />
              <p className="text-xs text-gray-400">Bold title at the top of the sidebar</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Brand Subtitle</Label>
              <Input value={settings.sidebarBrandSubtitle} onChange={(e) => set("sidebarBrandSubtitle", e.target.value)} className="text-sm" placeholder="Si-Ware Systems" />
              <p className="text-xs text-gray-400">Smaller text below the brand name</p>
            </div>
          </div>
          {/* Live preview */}
          <div className="rounded-lg bg-slate-900 px-4 py-3 flex items-center gap-3 w-fit">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">{(settings.sidebarBrandName || "A")[0]}</span>
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">{settings.sidebarBrandName || "Admin Portal"}</p>
              <p className="text-slate-400 text-xs leading-tight">{settings.sidebarBrandSubtitle || "Si-Ware Systems"}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Live preview</p>
          <SaveButton state={sidebarSave} onClick={() => persist(setSidebarSave)} label="Save Sidebar Settings" />
        </CardContent>
      </Card>

      {/* ── Header ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-teal-100 rounded-lg p-2"><Monitor className="h-4 w-4 text-teal-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Header</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Top bar logo and display options</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">

          {/* Header Logo upload */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Header Logo</Label>
            <div className="flex items-start gap-5">
              <div
                className="relative h-20 w-44 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors group"
                onClick={() => headerLogoInputRef.current?.click()}
                title="Click to upload a header logo"
              >
                <img src={headerLogo ?? "/siware-logo.png"} alt="Header logo preview" className="h-full w-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 rounded-xl">
                  <Upload className="h-5 w-5 text-white" />
                  <span className="text-white text-xs font-medium">Replace</span>
                </div>
              </div>
              <div className="flex-1 space-y-2 pt-1">
                <p className="text-sm font-medium text-gray-700">{headerLogo ? "Custom logo active" : "Default Si-Ware logo"}</p>
                <p className="text-xs text-gray-500">{headerLogo ? "Your uploaded logo is shown in the top bar." : "Upload your own logo for the top bar."}</p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => headerLogoInputRef.current?.click()} className="text-xs">
                    <Upload className="h-3.5 w-3.5 mr-1.5" />{headerLogo ? "Upload New" : "Upload Logo"}
                  </Button>
                  {headerLogo && (
                    <Button type="button" variant="outline" size="sm" onClick={handleHeaderLogoReset} className="text-xs border-red-200 text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />Restore Default
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-400">PNG, JPG, SVG or WebP · recommended 200×60px</p>
                {headerLogoSave === "saved" && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Header logo updated — reload the page to see it in the top bar.</p>}
                {headerLogoSave === "error" && <p className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />Please upload a valid image file.</p>}
              </div>
            </div>
            <input ref={headerLogoInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeaderLogoUpload} />
          </div>

          <div className="flex items-center justify-between py-2 border-t">
            <div>
              <p className="text-sm font-medium text-gray-800">Show Logo in Header</p>
              <p className="text-xs text-gray-500 mt-0.5">Display the logo centered in the top bar</p>
            </div>
            <Toggle checked={settings.headerShowLogo} onChange={(v) => set("headerShowLogo", v)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Logo Alt Text</Label>
            <Input value={settings.headerLogoAlt} onChange={(e) => set("headerLogoAlt", e.target.value)} className="text-sm" placeholder="Si-Ware Systems" />
            <p className="text-xs text-gray-400">Accessibility label for the header logo image</p>
          </div>

          {/* Live preview */}
          <div className="rounded-lg border bg-white flex items-center justify-between px-4 h-14 shadow-sm overflow-hidden">
            <div className="flex-1" />
            <div className="flex-1 flex items-center justify-center">
              {settings.headerShowLogo ? (
                <img
                  src={headerLogo ?? "/siware-logo.png"}
                  alt={settings.headerLogoAlt}
                  className="h-9 max-w-[160px] object-contain"
                />
              ) : (
                <span className="text-xs text-gray-400 italic">Logo hidden</span>
              )}
            </div>
            <div className="flex-1 flex justify-end items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Live preview</p>
          <SaveButton state={headerSave} onClick={() => persist(setHeaderSave)} label="Save Header Settings" />
        </CardContent>
      </Card>

      {/* ── Notifications ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-lg p-2"><Bell className="h-4 w-4 text-amber-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Notifications</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Configure email and in-app notification preferences</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-gray-800">Email & Notification Configuration</p>
              <p className="text-xs text-gray-500 mt-0.5">Configure SMTP, Gmail, SendGrid, or Brevo for outgoing emails</p>
            </div>
            <Button onClick={() => router.push("/admin/notifications")} className="bg-amber-600 hover:bg-amber-700 text-white shrink-0 ml-4" size="sm">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Security ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-red-100 rounded-lg p-2"><Shield className="h-4 w-4 text-red-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Security</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Authentication policies and session management</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <Clock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Session Timeout</p>
                <p className="text-xs text-gray-500 mt-0.5">Automatically log out inactive users after this period</p>
              </div>
            </div>
            <select value={settings.sessionTimeout} onChange={(e) => set("sessionTimeout", e.target.value)}
              className="h-8 rounded-md border border-input bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring shrink-0 ml-4">
              <option value="60">1 hour</option>
              <option value="240">4 hours</option>
              <option value="480">8 hours</option>
              <option value="1440">24 hours</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <Key className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Allow Multiple Sessions</p>
                <p className="text-xs text-gray-500 mt-0.5">Allow users to be logged in from multiple devices simultaneously</p>
              </div>
            </div>
            <Toggle checked={settings.allowMultipleSessions} onChange={(v) => set("allowMultipleSessions", v)} />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <Lock className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Require Strong Passwords</p>
                <p className="text-xs text-gray-500 mt-0.5">Enforce minimum 8 characters with uppercase, number, and symbol</p>
              </div>
            </div>
            <Toggle checked={settings.requireStrongPasswords} onChange={(v) => set("requireStrongPasswords", v)} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Password Expiry</p>
                <p className="text-xs text-gray-500 mt-0.5">Force users to reset their password periodically</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {settings.enforcePasswordExpiry && (
                <select value={settings.passwordExpiryDays} onChange={(e) => set("passwordExpiryDays", e.target.value)}
                  className="h-8 rounded-md border border-input bg-white px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="30">Every 30 days</option>
                  <option value="60">Every 60 days</option>
                  <option value="90">Every 90 days</option>
                  <option value="180">Every 180 days</option>
                </select>
              )}
              <Toggle checked={settings.enforcePasswordExpiry} onChange={(v) => set("enforcePasswordExpiry", v)} />
            </div>
          </div>
          <SaveButton state={securitySave} onClick={() => persist(setSecuritySave)} label="Save Security Settings" />
        </CardContent>
      </Card>

      {/* ── Feedback Survey ── */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 rounded-lg p-2"><Star className="h-4 w-4 text-amber-700" /></div>
            <div>
              <CardTitle className="text-base font-semibold text-gray-900">Feedback Survey</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Configure the automated satisfaction survey sent after a request is completed</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">

          {/* Enable / Disable toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div className="flex items-start gap-3">
              <Bell className="h-4 w-4 text-gray-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-800">Enable Feedback Surveys</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, a satisfaction survey email is automatically sent to the requester when their request is marked Completed or Delivered
                </p>
              </div>
            </div>
            <Toggle checked={settings.feedbackSurveyEnabled} onChange={(v) => set("feedbackSurveyEnabled", v)} />
          </div>

          {/* Email subject */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Email Subject</Label>
            <p className="text-xs text-gray-500">
              Available variables: <code className="bg-gray-100 px-1 rounded text-[11px]">{"{{requesterName}}"}</code>{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">{"{{requestTitle}}"}</code>{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">{"{{requestId}}"}</code>{" "}
              <code className="bg-gray-100 px-1 rounded text-[11px]">{"{{module}}"}</code>
            </p>
            <Input
              value={settings.feedbackSurveySubject}
              onChange={(e) => set("feedbackSurveySubject", e.target.value)}
              disabled={!settings.feedbackSurveyEnabled}
              placeholder="How was your {{module}} request? — {{requestTitle}}"
              className="h-9 text-sm disabled:opacity-50"
            />
          </div>

          {/* Email body */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-800">Email Body (greeting paragraph)</Label>
            <p className="text-xs text-gray-500">
              This text appears in the greeting section of the survey email, above the star rating buttons. Same variables apply.
            </p>
            <textarea
              value={settings.feedbackSurveyBody}
              onChange={(e) => set("feedbackSurveyBody", e.target.value)}
              disabled={!settings.feedbackSurveyEnabled}
              rows={5}
              placeholder="Hi {{requesterName}}, your request has been completed..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 resize-y"
            />
          </div>

          {/* Reset to default link */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                set("feedbackSurveySubject", DEFAULTS.feedbackSurveySubject)
                set("feedbackSurveyBody", DEFAULTS.feedbackSurveyBody)
              }}
              className="text-xs text-blue-600 hover:underline"
            >
              Reset to default text
            </button>
          </div>

          <SaveButton state={feedbackSave} onClick={() => persistFeedback(setFeedbackSave)} label="Save Survey Settings" />
        </CardContent>
      </Card>
    </div>
  )
}
