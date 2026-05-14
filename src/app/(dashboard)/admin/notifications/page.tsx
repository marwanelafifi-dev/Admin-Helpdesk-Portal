"use client"

import { useState, useEffect } from "react"
import {
  Mail, Bell, CheckCircle2, AlertTriangle, Eye, EyeOff,
  Settings, Zap, Shield, Globe, Key, Send, RefreshCw, Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────────────

type Method = "gmail_app_password" | "gmail_oauth2" | "smtp_relay" | "sendgrid" | "brevo" | "ses"

interface MethodDef {
  id: Method
  label: string
  icon: React.ElementType
  badge: string
  badgeColor: string
  description: string
  difficulty: "Easy" | "Medium" | "Advanced"
  recommended?: boolean
  fields: FieldDef[]
  guide: string[]
}

interface FieldDef {
  key: string
  label: string
  type: "text" | "password" | "email" | "select"
  placeholder: string
  hint?: string
  options?: { label: string; value: string }[]
}

interface Config {
  method: Method
  values: Record<string, string>
}

const CONFIG_KEY = "arp_notification_config"

// ── Method Definitions ─────────────────────────────────────────────────────────

const METHODS: MethodDef[] = [
  {
    id: "gmail_app_password",
    label: "Gmail App Password",
    icon: Mail,
    badge: "Personal Gmail",
    badgeColor: "bg-blue-100 text-blue-700",
    description: "Use a personal Gmail account with a 16-character App Password. Simple to set up, no admin access needed.",
    difficulty: "Easy",
    recommended: true,
    fields: [
      { key: "smtp_user", label: "Gmail Address", type: "email", placeholder: "yourname@gmail.com", hint: "Must be a @gmail.com account (not Workspace)" },
      { key: "smtp_password", label: "App Password", type: "password", placeholder: "xxxx xxxx xxxx xxxx", hint: "Generate at myaccount.google.com/apppasswords — requires 2FA enabled" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Portal" },
    ],
    guide: [
      "Sign in to your Gmail account at myaccount.google.com",
      "Go to Security → 2-Step Verification and enable it",
      "Go to Security → App passwords",
      "Select app: Mail, device: Other → type 'Admin Portal'",
      "Copy the 16-character password shown and paste it above",
    ],
  },
  {
    id: "gmail_oauth2",
    label: "Gmail OAuth2 (Google Workspace)",
    icon: Shield,
    badge: "Workspace",
    badgeColor: "bg-emerald-100 text-emerald-700",
    description: "Authenticate via Google OAuth2 using a service account. Works with Google Workspace (si-ware.com) and does not require an App Password.",
    difficulty: "Advanced",
    fields: [
      { key: "smtp_user", label: "Workspace Email", type: "email", placeholder: "adminhelpdesk@si-ware.com" },
      { key: "oauth2_client_id", label: "OAuth2 Client ID", type: "text", placeholder: "xxxxxxxxxxxx.apps.googleusercontent.com", hint: "From Google Cloud Console → APIs & Services → Credentials" },
      { key: "oauth2_client_secret", label: "OAuth2 Client Secret", type: "password", placeholder: "GOCSPX-xxxxxxxxxxxxxxx" },
      { key: "oauth2_refresh_token", label: "Refresh Token", type: "password", placeholder: "1//xxxxxxxxxxxxxxx", hint: "Generate using OAuth2 Playground or oauth2.js script" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Helpdesk" },
    ],
    guide: [
      "Go to console.cloud.google.com and create a project",
      "Enable the Gmail API under APIs & Services",
      "Create OAuth2 credentials (Web application type)",
      "Add http://localhost as an authorized redirect URI",
      "Use Google OAuth2 Playground to get a Refresh Token with Gmail scope",
      "Paste Client ID, Client Secret, and Refresh Token above",
    ],
  },
  {
    id: "smtp_relay",
    label: "Google Workspace SMTP Relay",
    icon: Globe,
    badge: "Google Admin",
    badgeColor: "bg-purple-100 text-purple-700",
    description: "Use smtp-relay.gmail.com with your Workspace account. Requires a one-time setup in Google Admin Console.",
    difficulty: "Medium",
    fields: [
      { key: "smtp_user", label: "Workspace Email", type: "email", placeholder: "adminhelpdesk@si-ware.com" },
      { key: "smtp_password", label: "App Password", type: "password", placeholder: "xxxx xxxx xxxx xxxx", hint: "App Password for this Workspace account" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Helpdesk" },
    ],
    guide: [
      "Open Google Admin Console at admin.google.com",
      "Go to Apps → Google Workspace → Gmail → Routing",
      "Scroll to 'SMTP relay service' → click Configure",
      "Add a rule: Allow only registered Workspace users, require TLS",
      "Save the rule — relay is now enabled for si-ware.com",
      "Use smtp-relay.gmail.com on port 587 with your Workspace credentials",
    ],
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    icon: Zap,
    badge: "Free 100/day",
    badgeColor: "bg-sky-100 text-sky-700",
    description: "HTTP-based email delivery. Not affected by corporate firewall SMTP blocks. Free tier: 100 emails/day.",
    difficulty: "Easy",
    fields: [
      { key: "api_key", label: "SendGrid API Key", type: "password", placeholder: "SG.xxxxxxxxxxxxxxxxxxxxxxxx", hint: "Create at app.sendgrid.com → Settings → API Keys" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Helpdesk" },
      { key: "smtp_user", label: "Verified Sender Email", type: "email", placeholder: "adminhelpdesk@si-ware.com", hint: "Must be verified in SendGrid → Sender Authentication" },
    ],
    guide: [
      "Create a free account at sendgrid.com",
      "Go to Settings → Sender Authentication → verify your email/domain",
      "Go to Settings → API Keys → Create API Key (Full Access)",
      "Copy the API key and paste it above",
      "The system will use SendGrid's HTTP API (not SMTP) — no firewall issues",
    ],
  },
  {
    id: "brevo",
    label: "Brevo (Sendinblue)",
    icon: Send,
    badge: "Free 300/day",
    badgeColor: "bg-orange-100 text-orange-700",
    description: "HTTP-based email delivery via Brevo API. Free tier: 300 emails/day. Not affected by SMTP firewall blocks.",
    difficulty: "Easy",
    fields: [
      { key: "api_key", label: "Brevo API Key", type: "password", placeholder: "xkeysib-xxxxxxxxxxxxxxxx", hint: "Create at app.brevo.com → Account → SMTP & API → API Keys" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Helpdesk" },
      { key: "smtp_user", label: "Verified Sender Email", type: "email", placeholder: "adminhelpdesk@si-ware.com" },
    ],
    guide: [
      "Create a free account at brevo.com",
      "Go to Account → SMTP & API → API Keys → Generate a new key",
      "Go to Senders & IP → Senders → add and verify your sender email",
      "Paste the API key above",
      "Brevo sends over HTTPS port 443 — no corporate firewall issues",
    ],
  },
  {
    id: "ses",
    label: "Amazon SES",
    icon: Key,
    badge: "AWS",
    badgeColor: "bg-amber-100 text-amber-700",
    description: "Amazon Simple Email Service. Extremely reliable and low-cost. Requires an AWS account.",
    difficulty: "Advanced",
    fields: [
      { key: "aws_access_key", label: "AWS Access Key ID", type: "text", placeholder: "AKIAIOSFODNN7EXAMPLE" },
      { key: "aws_secret_key", label: "AWS Secret Access Key", type: "password", placeholder: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" },
      { key: "aws_region", label: "AWS Region", type: "select", placeholder: "us-east-1", options: [
        { label: "US East (N. Virginia) — us-east-1", value: "us-east-1" },
        { label: "EU (Ireland) — eu-west-1", value: "eu-west-1" },
        { label: "EU (Frankfurt) — eu-central-1", value: "eu-central-1" },
        { label: "Middle East (Bahrain) — me-south-1", value: "me-south-1" },
      ]},
      { key: "smtp_user", label: "Verified Sender Email", type: "email", placeholder: "adminhelpdesk@si-ware.com" },
      { key: "smtp_from_name", label: "Sender Name", type: "text", placeholder: "Si-Ware Admin Helpdesk" },
    ],
    guide: [
      "Sign in to AWS Console and navigate to Amazon SES",
      "Verify your sender email address or domain",
      "Create IAM credentials with ses:SendEmail permission",
      "If in SES Sandbox, request production access to send to any email",
      "Paste your Access Key ID and Secret Key above",
    ],
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function loadConfig(): Config {
  if (typeof window === "undefined") return { method: "gmail_app_password", values: {} }
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : { method: "gmail_app_password", values: {} }
  } catch { return { method: "gmail_app_password", values: {} } }
}

function saveConfig(config: Config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}

const DIFFICULTY_COLORS = {
  Easy: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  Advanced: "bg-red-100 text-red-700",
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function NotificationConfigPage() {
  const [config, setConfig] = useState<Config>({ method: "gmail_app_password", values: {} })
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  useEffect(() => { setConfig(loadConfig()) }, [])

  const selectedMethod = METHODS.find((m) => m.id === config.method)!

  function setValue(key: string, value: string) {
    setConfig((prev) => ({ ...prev, values: { ...prev.values, [key]: value } }))
    setSaved(false)
    setTestResult(null)
  }

  function handleSave() {
    saveConfig(config)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/notifications/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      const data = await res.json()
      setTestResult({ ok: res.ok, message: data.message || (res.ok ? "Test email sent successfully!" : "Test failed") })
    } catch {
      setTestResult({ ok: false, message: "Could not reach the server. Check your connection." })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">Configure how email notifications are sent from the Admin Portal</p>
      </div>

      {/* Network warning */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold">Corporate Network Note</p>
          <p className="mt-0.5 text-amber-700">SMTP ports 465/587 are blocked by the corporate firewall (deep packet inspection). Use <strong>SendGrid</strong> or <strong>Brevo</strong> which send over HTTPS port 443 and are not affected.</p>
        </div>
      </div>

      {/* Method Selector */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600" />
            Select Sending Method
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {METHODS.map((method) => {
            const Icon = method.icon
            const active = config.method === method.id
            return (
              <button
                key={method.id}
                onClick={() => { setConfig({ method: method.id, values: {} }); setSaved(false); setTestResult(null) }}
                className={cn(
                  "text-left p-4 rounded-lg border-2 transition-all",
                  active ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("rounded-lg p-2 shrink-0", active ? "bg-blue-100" : "bg-gray-100")}>
                    <Icon className={cn("h-4 w-4", active ? "text-blue-600" : "text-gray-500")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("text-sm font-semibold", active ? "text-blue-900" : "text-gray-900")}>{method.label}</span>
                      {method.recommended && <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-medium">Recommended</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", method.badgeColor)}>{method.badge}</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", DIFFICULTY_COLORS[method.difficulty])}>{method.difficulty}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{method.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </CardContent>
      </Card>

      {/* Configuration Fields */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <selectedMethod.icon className="h-4 w-4 text-gray-600" />
            <CardTitle className="text-base font-semibold">{selectedMethod.label} — Configuration</CardTitle>
            <Badge className={cn("ml-auto text-xs", selectedMethod.badgeColor)}>{selectedMethod.badge}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          {selectedMethod.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">{field.label}</label>
              <div className="relative">
                {field.type === "select" ? (
                  <select
                    value={config.values[field.key] ?? ""}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select region...</option>
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                    placeholder={field.placeholder}
                    value={config.values[field.key] ?? ""}
                    onChange={(e) => setValue(field.key, e.target.value)}
                    className="pr-10 text-sm"
                  />
                )}
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPasswords((p) => ({ ...p, [field.key]: !p[field.key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {field.hint && (
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                  {field.hint}
                </p>
              )}
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Configuration
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testing ? "Sending..." : "Send Test Email"}
            </Button>
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Saved
              </span>
            )}
          </div>

          {testResult && (
            <div className={cn(
              "flex items-start gap-2 rounded-lg px-4 py-3 text-sm border",
              testResult.ok
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            )}>
              {testResult.ok
                ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50 rounded-t-lg">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-gray-600" />
            Setup Guide — {selectedMethod.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ol className="space-y-3">
            {selectedMethod.guide.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
