"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  FileText,
  Mail,
  Paperclip,
  Save,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { filesToAttachments, type AttachmentPayload } from "@/lib/attachments"
import { cn } from "@/lib/utils"

type AnnouncementRecord = {
  id: string
  subject: string
  body: string
  signature: string
  signatureLogo?: string
  to: string[]
  cc: string[]
  includeAllCompany: boolean
  attachments: AttachmentPayload[]
  createdBy: string
  createdByEmail: string
  createdAt: string
  updatedAt: string
  sentAt?: string
  recipientCount?: number
}

type TemplateRecord = {
  id: string
  name: string
  subject: string
  body: string
  signature: string
  signatureLogo?: string
  to: string[]
  cc: string[]
  includeAllCompany: boolean
  autoSendEnabled: boolean
  scheduleFrequency?: "once" | "weekly" | "monthly"
  scheduleDayOfWeek?: number
  scheduledAt?: string
  lastScheduledSentAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

type Tab = "sent" | "drafts" | "templates"

const EGYPT_TEAM_EMAIL = "eg.team@si-ware.com"
const DEFAULT_SIGNATURE =
  "Administration Team\n+20222684704\n\nThis message and any attachments are confidential and may be privileged or otherwise protected from disclosure. If you are not the intended recipient, please telephone or mail the sender and delete this message and any attachment from your system."
const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

function splitEmails(value: string): string[] {
  return Array.from(new Set(value
    .split(/[\n,;]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)))
}

function joinEmails(values: string[]) {
  return values.join("\n")
}

function formatDate(value?: string) {
  if (!value) return "-"
  return new Date(value).toLocaleString()
}

function toDatetimeLocal(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : undefined
}

function formatDayLabel(dayOfWeek?: number) {
  return WEEKDAY_OPTIONS.find((item) => item.value === dayOfWeek)?.label ?? "Monday"
}

export default function AnnouncementsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>("sent")
  const [sent, setSent] = useState<AnnouncementRecord[]>([])
  const [drafts, setDrafts] = useState<AnnouncementRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [includeAllCompany, setIncludeAllCompany] = useState(false)
  const [includeEgyptTeam, setIncludeEgyptTeam] = useState(false)
  const [toText, setToText] = useState("")
  const [ccText, setCcText] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [signature, setSignature] = useState(DEFAULT_SIGNATURE)
  const [signatureLogo, setSignatureLogo] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [autoSendEnabled, setAutoSendEnabled] = useState(false)
  const [scheduleFrequency, setScheduleFrequency] = useState<"once" | "weekly" | "monthly">("once")
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState(1)
  const [scheduledAt, setScheduledAt] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const toEmails = useMemo(
    () => Array.from(new Set([
      ...(includeEgyptTeam ? [EGYPT_TEAM_EMAIL] : []),
      ...splitEmails(toText),
    ])),
    [includeEgyptTeam, toText]
  )

  const recipientCountLabel = includeAllCompany ? "All company" : `${toEmails.length} recipient${toEmails.length === 1 ? "" : "s"}`

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Failed to load announcements")
      setSent(json.data?.sent ?? [])
      setDrafts(json.data?.drafts ?? [])
      setTemplates(json.data?.templates ?? [])
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to load announcements" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function resetCompose() {
    setSubject("")
    setBody("")
    setTemplateName("")
    setToText("")
    setCcText("")
    setIncludeAllCompany(false)
    setIncludeEgyptTeam(false)
    setFiles([])
    setSignature(DEFAULT_SIGNATURE)
    setSignatureLogo("")
    setAutoSendEnabled(false)
    setScheduleFrequency("once")
    setScheduleDayOfWeek(1)
    setScheduledAt("")
    setCurrentDraftId(null)
  }

  function useTemplate(template: TemplateRecord) {
    setSubject(template.subject)
    setBody(template.body)
    setSignature(template.signature || DEFAULT_SIGNATURE)
    setSignatureLogo(template.signatureLogo || "")
    setTemplateName(template.name)
    setIncludeAllCompany(Boolean(template.includeAllCompany))
    setIncludeEgyptTeam((template.to ?? []).includes(EGYPT_TEAM_EMAIL))
    setToText(joinEmails((template.to ?? []).filter((email) => email !== EGYPT_TEAM_EMAIL)))
    setCcText(joinEmails(template.cc ?? []))
    setFiles([])
    setAutoSendEnabled(Boolean(template.autoSendEnabled))
    setScheduleFrequency(template.scheduleFrequency || "once")
    setScheduleDayOfWeek(typeof template.scheduleDayOfWeek === "number" ? template.scheduleDayOfWeek : 1)
    setScheduledAt(toDatetimeLocal(template.scheduledAt))
    setNotice({ type: "success", message: `Template loaded: ${template.name}` })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function loadDraft(draft: AnnouncementRecord) {
    setCurrentDraftId(draft.id)
    setSubject(draft.subject)
    setBody(draft.body)
    setSignature(draft.signature || DEFAULT_SIGNATURE)
    setSignatureLogo(draft.signatureLogo || "")
    setIncludeEgyptTeam((draft.to ?? []).includes(EGYPT_TEAM_EMAIL))
    setToText(joinEmails((draft.to ?? []).filter((email) => email !== EGYPT_TEAM_EMAIL)))
    setCcText(joinEmails(draft.cc ?? []))
    setIncludeAllCompany(draft.includeAllCompany)
    setFiles([])
    setNotice({ type: "success", message: "Draft loaded into compose" })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  async function buildAttachments() {
    return filesToAttachments(files, "announcement")
  }

  async function saveDraft() {
    setSaving(true)
    setNotice(null)
    try {
      const attachments = await buildAttachments()
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "draft",
          id: currentDraftId ?? undefined,
          subject,
          body,
          signature,
          signatureLogo: signatureLogo || undefined,
          to: toEmails,
          cc: splitEmails(ccText),
          includeAllCompany,
          attachments,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Failed to save draft")
      setCurrentDraftId(json.draft?.id ?? currentDraftId)
      await loadData()
      setNotice({ type: "success", message: "Draft saved" })
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to save draft" })
    } finally {
      setSaving(false)
    }
  }

  async function saveTemplate() {
    setSaving(true)
    setNotice(null)
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "template",
          templateName: templateName || subject,
          subject,
          body,
          signature,
          signatureLogo: signatureLogo || undefined,
          to: toEmails,
          cc: splitEmails(ccText),
          includeAllCompany,
          autoSendEnabled,
          scheduleFrequency: autoSendEnabled ? scheduleFrequency : "once",
          scheduleDayOfWeek: autoSendEnabled && scheduleFrequency === "weekly" ? scheduleDayOfWeek : undefined,
          scheduledAt: autoSendEnabled ? fromDatetimeLocal(scheduledAt) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Failed to save template")
      await loadData()
      setNotice({ type: "success", message: "Template saved" })
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to save template" })
    } finally {
      setSaving(false)
    }
  }

  async function sendAnnouncement() {
    setSending(true)
    setNotice(null)
    try {
      const attachments = await buildAttachments()
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "send",
          id: currentDraftId ?? undefined,
          subject,
          body,
          signature,
          signatureLogo: signatureLogo || undefined,
          to: toEmails,
          cc: splitEmails(ccText),
          includeAllCompany,
          attachments,
        }),
      })

      let json: any
      try {
        json = await res.json()
      } catch (parseError) {
        const text = await res.text()
        throw new Error(`Invalid response from server: ${text?.slice(0, 100) || "No response body"}`)
      }

      if (!res.ok) throw new Error(json?.error ?? "Failed to send announcement")
      resetCompose()
      await loadData()
      setActiveTab("sent")
      setNotice({ type: "success", message: "Announcement sent" })
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to send announcement" })
    } finally {
      setSending(false)
    }
  }

  async function deleteRecord(type: "drafts" | "templates", id: string) {
    const res = await fetch(`/api/announcements?type=${type}&id=${encodeURIComponent(id)}`, { method: "DELETE" })
    if (res.ok) await loadData()
  }

  const tabs = [
    { id: "sent" as const, label: "Sent", count: sent.length },
    { id: "drafts" as const, label: "Drafts", count: drafts.length },
    { id: "templates" as const, label: "Templates", count: templates.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-sm text-gray-500 mt-1">Compose and send formal company announcements from the Admin Portal.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPreview(true)} disabled={!subject.trim() || !body.trim()} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50">
            <Eye className="h-4 w-4" />
            Preview Email
          </Button>
          <Button onClick={sendAnnouncement} disabled={sending || !subject.trim() || !body.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send Announcement"}
          </Button>
        </div>
      </div>

      {notice && (
        <div className={cn(
          "flex items-center gap-2 rounded-lg border px-4 py-3 text-sm",
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        )}>
          {notice.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
          {notice.message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Compose Announcement
            </CardTitle>
            <p className="text-xs text-gray-500 mt-2">Create a formal announcement to send to company users</p>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Email Subject Line</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="NOTIFICATION: Medright Doctor Now Available"
                className="font-medium"
              />
              <p className="text-xs text-gray-500">Use a clear, professional subject line. Recipients will see this in their inbox.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Template Name (Optional)</label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Doctor available notice"
              />
              <p className="text-xs text-gray-500">Save this announcement as a template for future use</p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <input
                    type="checkbox"
                    checked={autoSendEnabled}
                    onChange={(e) => setAutoSendEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Auto send template
                </label>
                <select
                  value={scheduleFrequency}
                  onChange={(e) => setScheduleFrequency(e.target.value as "once" | "weekly" | "monthly")}
                  disabled={!autoSendEnabled}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="once">Once</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {scheduleFrequency === "weekly" ? "Start date & time" : "Send date & time"}
                  </label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={!autoSendEnabled}
                  />
                </div>
                {scheduleFrequency === "weekly" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Day of week</label>
                    <select
                      value={scheduleDayOfWeek}
                      onChange={(e) => setScheduleDayOfWeek(Number(e.target.value))}
                      disabled={!autoSendEnabled}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {WEEKDAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Email Message Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder={"Dear Colleagues,\n\nMedright doctor is now available on the 1st floor, in the Rec. Area.\n\nBest regards,"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-gray-500">Write a formal, professional message. The signature will be added automatically.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Email Signature</label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={8}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-xs"
              />
              <p className="text-xs text-gray-500">Professional signature including title, contact info, and legal disclaimer</p>
            </div>
            <div className="space-y-2 rounded-lg border bg-blue-50 p-4 border-blue-200">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-gray-700">Signature Logo (Optional)</label>
                <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("announcement-logo-input")?.click()} className="bg-white hover:bg-gray-50">Upload logo</Button>
              </div>
              <input
                id="announcement-logo-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => setSignatureLogo(typeof reader.result === "string" ? reader.result : "")
                  reader.readAsDataURL(file)
                }}
              />
              {signatureLogo ? (
                <div className="flex items-center gap-3 rounded-md border bg-white p-3">
                  <img src={signatureLogo} alt="Signature logo preview" className="h-12 w-12 rounded object-contain" />
                  <span className="text-sm text-gray-600">Logo ready to be used in the email signature</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No custom signature logo selected yet.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveDraft} disabled={saving || !subject.trim() || !body.trim()}>
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button type="button" variant="outline" onClick={saveTemplate} disabled={saving || !subject.trim() || !body.trim() || (autoSendEnabled && !scheduledAt)}>
                <Copy className="h-4 w-4" />
                Save Template
              </Button>
              <Button type="button" variant="ghost" onClick={resetCompose}>Clear</Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Add recipients</label>
                <label className="mb-2 flex items-center gap-2 rounded-lg border bg-blue-50 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeEgyptTeam}
                    onChange={(e) => setIncludeEgyptTeam(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-blue-950">Egypt Team</span>
                    <span className="block truncate text-xs text-blue-700">&lt;{EGYPT_TEAM_EMAIL}&gt;</span>
                  </span>
                </label>
                <textarea
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  rows={3}
                  placeholder="name@si-ware.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">CC</label>
                <textarea
                  value={ccText}
                  onChange={(e) => setCcText(e.target.value)}
                  rows={3}
                  placeholder="manager@si-ware.com"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Audience</label>
                  <Badge variant="secondary">{recipientCountLabel}</Badge>
                </div>
                <label className="flex items-center gap-2 rounded-lg border bg-blue-50 border-blue-200 px-3 py-2 text-sm font-medium text-blue-900">
                  <input
                    type="checkbox"
                    checked={includeAllCompany}
                    onChange={(e) => setIncludeAllCompany(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Send to all company users
                </label>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-blue-600" />
                Attachments
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              <Button type="button" variant="outline" className="w-full" onClick={() => fileRef.current?.click()}>
                <Paperclip className="h-4 w-4" />
                Add Attachments
              </Button>
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file, idx) => (
                    <div key={`${file.name}-${idx}`} className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                      <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  activeTab === tab.id ? "bg-blue-600 text-white" : "bg-white text-gray-700 border hover:bg-gray-50"
                )}
              >
                {tab.label}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", activeTab === tab.id ? "bg-white text-blue-700" : "bg-gray-100 text-gray-600")}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === "sent" && (
            <RecordList
              empty="No announcements sent yet."
              records={sent}
              actionLabel="Reuse"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              onAction={(record) => {
                setSubject(record.subject)
                setBody(record.body)
                setSignature(record.signature || DEFAULT_SIGNATURE)
                setIncludeEgyptTeam((record.to ?? []).includes(EGYPT_TEAM_EMAIL))
                setToText(joinEmails((record.to ?? []).filter((email) => email !== EGYPT_TEAM_EMAIL)))
                setCcText(joinEmails(record.cc ?? []))
                setIncludeAllCompany(record.includeAllCompany)
                window.scrollTo({ top: 0, behavior: "smooth" })
              }}
            />
          )}

          {activeTab === "drafts" && (
            <RecordList
              empty="No saved drafts."
              records={drafts}
              actionLabel="Edit"
              icon={<Clock className="h-4 w-4 text-amber-600" />}
              onAction={loadDraft}
              onDelete={(record) => deleteRecord("drafts", record.id)}
            />
          )}

          {activeTab === "templates" && (
            <div className="divide-y">
              {templates.map((template) => (
                <div key={template.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-blue-600" />
                      <p className="font-semibold text-gray-900 truncate">{template.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700 truncate">{template.subject}</p>
                    <p className="mt-1 text-xs text-gray-500">Updated {formatDate(template.updatedAt)}</p>
                    {template.autoSendEnabled && template.scheduledAt && (
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        Auto sends {template.scheduleFrequency || "once"}
                        {template.scheduleFrequency === "weekly" && template.scheduleDayOfWeek !== undefined
                          ? ` · ${formatDayLabel(template.scheduleDayOfWeek)}`
                          : ""}
                        · {formatDate(template.scheduledAt)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => useTemplate(template)}>Use</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRecord("templates", template.id)} className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!loading && templates.length === 0 && (
                <div className="px-5 py-10 text-center text-sm text-gray-500">No templates saved.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Modal — Realistic Email Client View */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 border-b bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Email Preview</h2>
                <p className="text-sm text-blue-100 mt-0.5">Exactly how it will appear to recipients</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-blue-100 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Email Client Wrapper */}
            <div className="overflow-auto flex-1">
              <div className="bg-gray-100 p-6">
                {/* Email Header (Email Client Style) */}
                <div className="bg-white rounded-t-lg shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-16">From:</span>
                        <span className="text-gray-900">Admin Helpdesk &lt;admin@si-ware.com&gt;</span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-16">To:</span>
                        <span className="text-gray-900">
                          {includeAllCompany ? "All Company Users" : toEmails.slice(0, 2).join(", ")}
                          {!includeAllCompany && toEmails.length > 2 ? ` +${toEmails.length - 2}` : ""}
                        </span>
                      </div>
                      {splitEmails(ccText).length > 0 && (
                        <div className="flex items-center">
                          <span className="font-semibold text-gray-700 w-16">CC:</span>
                          <span className="text-gray-900">{splitEmails(ccText).slice(0, 2).join(", ")}{splitEmails(ccText).length > 2 ? ` +${splitEmails(ccText).length - 2}` : ""}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="font-semibold text-gray-700 w-16">Subject:</span>
                        <span className="text-gray-900 font-medium">{subject || "(No subject)"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="px-8 py-8">
                    {/* Si-Ware Logo Header */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-blue-100">
                      <div className="inline-block bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm tracking-wide">
                        SI-WARE SYSTEMS
                      </div>
                    </div>

                    {/* Email Content */}
                    <div className="text-gray-800 space-y-4">
                      {/* Subject as heading */}
                      <h1 className="text-2xl font-bold text-gray-900 mb-6 leading-tight">
                        {subject || "Announcement"}
                      </h1>

                      {/* Body text with proper line breaks */}
                      <div className="whitespace-pre-wrap text-base leading-relaxed text-gray-700 font-normal">
                        {body}
                      </div>

                      {/* Signature Section */}
                      <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-600">
                        <div className="whitespace-pre-wrap font-normal leading-relaxed mb-4">
                          {signature}
                        </div>
                        {signatureLogo && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <img
                              src={signatureLogo}
                              alt="Company logo"
                              className="h-12 w-auto"
                            />
                          </div>
                        )}
                      </div>

                      {/* Attachments */}
                      {files.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-gray-300">
                          <p className="text-sm font-semibold text-gray-900 mb-3">Attachments ({files.length})</p>
                          <div className="space-y-2">
                            {files.map((file, idx) => (
                              <div
                                key={`${file.name}-${idx}`}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 w-fit"
                              >
                                <Paperclip className="h-4 w-4 text-gray-500" />
                                <span>{file.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Info Bar */}
            <div className="border-t bg-amber-50 border-amber-200 px-6 py-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-semibold">Sending to {includeAllCompany ? "all company users" : `${toEmails.length} recipient${toEmails.length !== 1 ? 's' : ''}`}</p>
                  <p className="text-xs text-amber-700 mt-1">Please review the content and recipient list before sending</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t bg-white px-6 py-4 flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Back to Edit
              </Button>
              <Button
                onClick={() => {
                  setShowPreview(false)
                  sendAnnouncement()
                }}
                disabled={sending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <Send className="h-4 w-4" />
                {sending ? "Sending..." : "Send Now"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecordList({
  records,
  empty,
  actionLabel,
  icon,
  onAction,
  onDelete,
}: {
  records: AnnouncementRecord[]
  empty: string
  actionLabel: string
  icon: React.ReactNode
  onAction: (record: AnnouncementRecord) => void
  onDelete?: (record: AnnouncementRecord) => void
}) {
  if (records.length === 0) {
    return <div className="px-5 py-10 text-center text-sm text-gray-500">{empty}</div>
  }

  return (
    <div className="divide-y">
      {records.map((record) => (
        <div key={record.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {icon}
              <p className="font-semibold text-gray-900 truncate">{record.subject}</p>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              <span>{record.sentAt ? `Sent ${formatDate(record.sentAt)}` : `Updated ${formatDate(record.updatedAt)}`}</span>
              <span>{record.includeAllCompany ? "All company" : `${record.to.length} direct recipient(s)`}</span>
              {record.cc.length > 0 && <span>{record.cc.length} CC</span>}
              {record.attachments.length > 0 && <span>{record.attachments.length} attachment(s)</span>}
            </div>
            <p className="mt-1 text-sm text-gray-600 line-clamp-1">{record.body}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onAction(record)}>{actionLabel}</Button>
            {onDelete && (
              <Button variant="ghost" size="sm" onClick={() => onDelete(record)} className="text-red-600 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
