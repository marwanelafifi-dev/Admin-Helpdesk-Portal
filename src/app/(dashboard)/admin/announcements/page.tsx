"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  CheckCircle2,
  Clock,
  Copy,
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
  createdBy: string
  createdAt: string
  updatedAt: string
}

type DirectoryUser = {
  id: string
  name: string
  email: string
  role: string
}

type Tab = "sent" | "drafts" | "templates"

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

export default function AnnouncementsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>("sent")
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [sent, setSent] = useState<AnnouncementRecord[]>([])
  const [drafts, setDrafts] = useState<AnnouncementRecord[]>([])
  const [templates, setTemplates] = useState<TemplateRecord[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [includeAllCompany, setIncludeAllCompany] = useState(true)
  const [toText, setToText] = useState("")
  const [ccText, setCcText] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const selectedUserEmails = useMemo(
    () => users.filter((user) => selectedUserIds.includes(user.id)).map((user) => user.email),
    [users, selectedUserIds]
  )

  const toEmails = useMemo(
    () => Array.from(new Set([...splitEmails(toText), ...selectedUserEmails])),
    [toText, selectedUserEmails]
  )

  const manualRecipientCount = toEmails.length
  const recipientCount = includeAllCompany
    ? new Set([...users.map((user) => user.email), ...toEmails]).size
    : manualRecipientCount

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/announcements", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? "Failed to load announcements")
      setSent(json.data?.sent ?? [])
      setDrafts(json.data?.drafts ?? [])
      setTemplates(json.data?.templates ?? [])
      setUsers(json.users ?? [])
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
    setIncludeAllCompany(true)
    setSelectedUserIds([])
    setFiles([])
    setCurrentDraftId(null)
  }

  function useTemplate(template: TemplateRecord) {
    setSubject(template.subject)
    setBody(template.body)
    setTemplateName(template.name)
    setNotice({ type: "success", message: `Template loaded: ${template.name}` })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function loadDraft(draft: AnnouncementRecord) {
    setCurrentDraftId(draft.id)
    setSubject(draft.subject)
    setBody(draft.body)
    setToText(joinEmails(draft.to ?? []))
    setCcText(joinEmails(draft.cc ?? []))
    setIncludeAllCompany(draft.includeAllCompany)
    setSelectedUserIds([])
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
          to: toEmails,
          cc: splitEmails(ccText),
          includeAllCompany,
          attachments,
        }),
      })
      const json = await res.json()
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
          <p className="text-sm text-gray-500 mt-1">Compose and send company announcements from the Admin Portal.</p>
        </div>
        <Button onClick={sendAnnouncement} disabled={sending || !subject.trim() || !body.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="h-4 w-4" />
          {sending ? "Sending..." : "Send Announcement"}
        </Button>
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
              Compose Email
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="NOTIFICATION: Medright Doctor Now Available" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Template name</label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Doctor available notice" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Message</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={11}
                placeholder={"Dear Colleagues,\n\nMedright doctor is now available on the 1st floor, in the Rec. Area.\n\nBest regards,\nAdmin Helpdesk"}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveDraft} disabled={saving || !subject.trim() || !body.trim()}>
                <Save className="h-4 w-4" />
                Save Draft
              </Button>
              <Button type="button" variant="outline" onClick={saveTemplate} disabled={saving || !subject.trim() || !body.trim()}>
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
              <label className="flex items-center gap-2 rounded-lg border bg-blue-50 border-blue-200 px-3 py-2 text-sm font-medium text-blue-900">
                <input
                  type="checkbox"
                  checked={includeAllCompany}
                  onChange={(e) => setIncludeAllCompany(e.target.checked)}
                  className="h-4 w-4"
                />
                Send to all company users
              </label>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Add recipients</label>
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
                  <label className="text-sm font-medium text-gray-700">Directory</label>
                  <Badge variant="secondary">{recipientCount} recipient{recipientCount === 1 ? "" : "s"}</Badge>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(user.id)}
                        onChange={(e) => {
                          setSelectedUserIds((prev) => e.target.checked
                            ? [...prev, user.id]
                            : prev.filter((id) => id !== user.id))
                        }}
                        className="h-4 w-4"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-gray-900">{user.name}</span>
                        <span className="block truncate text-xs text-gray-500">{user.email}</span>
                      </span>
                    </label>
                  ))}
                  {!loading && users.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">No active users found.</div>
                  )}
                </div>
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
                setToText(joinEmails(record.to ?? []))
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
