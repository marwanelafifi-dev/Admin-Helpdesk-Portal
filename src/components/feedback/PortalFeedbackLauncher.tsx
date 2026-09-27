"use client"

import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { CheckCircle2, FileImage, Lightbulb, MessageSquarePlus, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Category = "general" | "bug" | "feature_request" | "ui_ux"
type FeedbackRecord = { id: string; title: string; category: Category; status: string; createdAt: string; comment: string; attachments?: Array<{ id: string; name: string }> }
type Attachment = { id: string; name: string; type: string; size: number; url: string; uploadedAt: string }
type PortalFunction = "Home Page" | "Administration Team" | "Finance Team" | "People Team"

const PORTAL_FUNCTIONS: PortalFunction[] = ["Home Page", "Administration Team", "Finance Team", "People Team"]
const FUNCTION_MODULES: Record<Exclude<PortalFunction, "Home Page">, string[]> = {
  "Administration Team": ["Shipping", "Maintenance", "Purchase", "Event", "Travel", "General", "HR — Onboarding", "HR — Offboarding"],
  "Finance Team": ["Reimbursement", "Travel Reimbursement", "Invoice Payment", "Finance Requests"],
  "People Team": ["HR General Request", "Letter Request", "Travel Letter"],
}

const CATEGORIES: Array<{ value: Category; label: string; description: string }> = [
  { value: "general", label: "Improvement", description: "Make an existing experience better" },
  { value: "bug", label: "Something is not working", description: "Report an error or unexpected behavior" },
  { value: "feature_request", label: "New feature", description: "Suggest a capability you need" },
  { value: "ui_ux", label: "Design & usability", description: "Share a clarity or usability idea" },
]

function detectFunction(path: string) {
  if (path.startsWith("/departments/finance")) return "Finance Team"
  if (path.startsWith("/departments/hr")) return "People Team"
  if (path.startsWith("/departments/admin") || ["/shipping", "/maintenance", "/purchase", "/event", "/travel", "/general"].some((segment) => path.startsWith(segment))) return "Administration Team"
  return "Home Page"
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function openPortalFeedback() {
  window.dispatchEvent(new Event("arp:open-portal-feedback"))
}

export function PortalFeedbackLauncher() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>("general")
  const [functionName, setFunctionName] = useState<PortalFunction>("Home Page")
  const [moduleName, setModuleName] = useState("")
  const [title, setTitle] = useState("")
  const [comment, setComment] = useState("")
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [successId, setSuccessId] = useState("")
  const [myFeedback, setMyFeedback] = useState<FeedbackRecord[]>([])
  const [showMySubmissions, setShowMySubmissions] = useState(false)
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null)

  useEffect(() => {
    const listener = () => {
      setFunctionName(detectFunction(window.location.pathname) as PortalFunction)
      setModuleName("")
      setOpen(true)
    }
    window.addEventListener("arp:open-portal-feedback", listener)
    return () => window.removeEventListener("arp:open-portal-feedback", listener)
  }, [])

  useEffect(() => {
    if (!open) return
    fetch("/api/feedback/admin-survey?mode=own")
      .then((response) => response.ok ? response.json() : { surveys: [] })
      .then((data) => setMyFeedback(Array.isArray(data.surveys) ? data.surveys : []))
      .catch(() => setMyFeedback([]))
  }, [open])

  function resetForm() {
    setCategory("general")
    setFunctionName("Home Page")
    setModuleName("")
    setTitle("")
    setComment("")
    setAttachments([])
    setError("")
    setSuccessId("")
    setShowMySubmissions(false)
    setSelectedFeedbackId(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    event.target.value = ""
    if (!files.length) return
    if (attachments.length + files.length > 3) return setError("You can attach up to three screenshots.")
    if (files.some((file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1_000_000)) {
      return setError("Screenshots must be PNG, JPEG, or WebP files no larger than 1 MB.")
    }
    if (attachments.reduce((total, item) => total + item.size, 0) + files.reduce((total, file) => total + file.size, 0) > 2_000_000) {
      return setError("The combined screenshot size cannot exceed 2 MB.")
    }
    try {
      const added = await Promise.all(files.map((file) => new Promise<Attachment>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, url: String(reader.result), uploadedAt: new Date().toISOString() })
        reader.onerror = () => reject(new Error("The screenshot could not be read."))
        reader.readAsDataURL(file)
      })))
      setAttachments((current) => [...current, ...added])
      setError("")
    } catch {
      setError("The screenshot could not be read. Please try again.")
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    if (!title.trim() || !comment.trim()) return setError("Add a short title and description so the team can investigate.")
    if (functionName !== "Home Page" && !moduleName) return setError("Choose the module this feedback is about.")
    setSubmitting(true)
    try {
      const path = window.location.pathname
      const response = await fetch("/api/feedback/admin-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, title, comment, attachments, context: { pageUrl: window.location.href, path, functionName, moduleName, userAgent: navigator.userAgent } }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Feedback could not be submitted.")
      setSuccessId(data.survey.id)
      setMyFeedback((current) => [{ id: data.survey.id, title: data.survey.title, comment: data.survey.comment, attachments: data.survey.attachments, category: data.survey.category, status: data.survey.status, createdAt: data.survey.createdAt }, ...current])
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Feedback could not be submitted.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-slate-200 bg-background p-0 dark:border-slate-700">
        <div className="relative overflow-hidden border-b border-blue-200 bg-gradient-to-br from-[#f5f9ff] via-[#eef6ff] to-[#dcecff] px-6 py-5 text-[#173f91] before:pointer-events-none before:absolute before:-left-16 before:-top-20 before:h-48 before:w-72 before:rounded-full before:bg-blue-300/35 before:blur-3xl dark:border-sky-300/25 dark:!bg-[radial-gradient(ellipse_90%_170%_at_22%_0%,_#1d5487_0%,_#13395f_38%,_#0a1d34_100%)] dark:before:bg-cyan-300/15 dark:text-white">
          <DialogHeader className="relative z-10 space-y-1 pr-10 text-left">
            <div className="flex items-center gap-2 text-[#173f91] dark:text-cyan-100"><span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-200 bg-white/70 shadow-sm dark:border-sky-300/25 dark:bg-sky-300/10"><MessageSquarePlus className="h-4 w-4" /></span><span className="text-xs font-bold uppercase tracking-[0.14em]">Si-Ware Portal Feedback</span></div>
            <DialogTitle className="text-xl text-[#173f91] dark:text-white">Help us improve your daily experience</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">Your feedback goes directly to the platform team. We automatically include the page you are using to speed up follow-up.</DialogDescription>
          </DialogHeader>
        </div>
        {successId ? (
          <div className="space-y-5 px-6 py-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <div><h3 className="text-lg font-semibold">Thank you — your feedback is received.</h3><p className="mt-1 text-sm text-muted-foreground">Reference: <span className="font-mono font-semibold text-foreground">{successId}</span>. You can see its current status whenever you reopen this form.</p></div>
            <div className="flex flex-col justify-center gap-2 sm:flex-row"><Button variant="outline" onClick={() => { setSuccessId(""); setShowMySubmissions(true) }}>View my submissions</Button><Button onClick={() => handleOpenChange(false)}>Done</Button></div>
          </div>
        ) : showMySubmissions ? (
          <div className="space-y-5 px-6 py-6"><div><h3 className="text-lg font-semibold">My portal feedback</h3><p className="mt-1 text-sm text-muted-foreground">Track the feedback you have submitted and its current status.</p></div>{myFeedback.length === 0 ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">You have not submitted portal feedback yet.</div> : <div className="space-y-2">{myFeedback.map((item) => { const expanded = selectedFeedbackId === item.id; return <div key={item.id} className="rounded-lg border bg-muted/30 px-3 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 font-mono text-xs text-muted-foreground">{item.id}</p></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-background px-2 py-1 text-xs font-medium text-muted-foreground">{formatStatus(item.status)}</span><button type="button" onClick={() => setSelectedFeedbackId(expanded ? null : item.id)} className="text-xs font-semibold text-blue-600 hover:underline">{expanded ? "Hide" : "View details"}</button></div></div>{expanded && <div className="mt-3 space-y-3 border-t pt-3 text-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your submission</p><p className="mt-1 whitespace-pre-wrap leading-6">{item.comment}</p></div><div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2"><span>Category: <b className="text-foreground">{formatStatus(item.category)}</b></span><span>Submitted: <b className="text-foreground">{new Date(item.createdAt).toLocaleString()}</b></span></div>{item.attachments && item.attachments.length > 0 && <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Attachments</p><div className="flex flex-wrap gap-2">{item.attachments.map((attachment) => <a key={attachment.id} href={`/api/feedback/admin-survey/attachments/${item.id}--${attachment.id}`} target="_blank" rel="noreferrer" className="rounded-md border bg-background px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50">Open {attachment.name}</a>)}</div></div>}</div>}</div> })}</div>}<DialogFooter className="border-t pt-4"><Button variant="outline" onClick={() => handleOpenChange(false)}>Close</Button><Button onClick={() => setShowMySubmissions(false)}>Send new feedback</Button></DialogFooter></div>
        ) : (
          <form onSubmit={submit} className="space-y-5 px-6 py-5">
            <div><p className="mb-2 text-sm font-semibold">What would you like to share?</p><div className="grid gap-2 sm:grid-cols-2">{CATEGORIES.map((item) => <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={`rounded-lg border p-3 text-left transition ${category === item.value ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600 dark:border-cyan-400 dark:bg-cyan-950/30" : "border-border hover:border-blue-300 hover:bg-muted/50"}`}><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></button>)}</div></div>
            <label className="grid gap-1.5 text-sm font-medium">Which function is this about?<select value={functionName} onChange={(event) => { setFunctionName(event.target.value as PortalFunction); setModuleName("") }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"><option value="Home Page">Home Page / Company Portal</option>{PORTAL_FUNCTIONS.filter((item) => item !== "Home Page").map((item) => <option key={item} value={item}>{item}</option>)}</select><span className="text-xs font-normal text-muted-foreground">Choose the area your feedback relates to. The current page is selected automatically.</span></label>
            {functionName !== "Home Page" && <label className="grid gap-1.5 text-sm font-medium">Which module is this about?<select required value={moduleName} onChange={(event) => setModuleName(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"><option value="" disabled>Select a {functionName} module</option>{FUNCTION_MODULES[functionName].map((module) => <option key={module} value={module}>{module}</option>)}</select><span className="text-xs font-normal text-muted-foreground">Required so the correct team can review your feedback.</span></label>}
            <div className="grid gap-4"><label className="grid gap-1.5 text-sm font-medium">Short title<Input maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Example: The request status is hard to understand" /></label><label className="grid gap-1.5 text-sm font-medium">Tell us more<Textarea maxLength={3000} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What happened, what did you expect, and how could we make it better?" className="min-h-28" /><span className="text-right text-xs text-muted-foreground">{comment.length}/3000</span></label></div>
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">Supporting screenshots <span className="font-normal text-muted-foreground">(optional)</span></p><p className="text-xs text-muted-foreground">PNG, JPEG, or WebP — up to 3 files, 2 MB total.</p></div><label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent"><FileImage className="h-4 w-4" />Add<input type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={handleFiles} /></label></div>{attachments.length > 0 && <div className="mt-3 space-y-1.5">{attachments.map((attachment) => <div key={attachment.id} className="flex items-center justify-between rounded bg-background px-2.5 py-1.5 text-xs"><span className="truncate pr-2">{attachment.name}</span><button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))} className="text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button></div>)}</div>}</div>
            {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">{error}</p>}
            {myFeedback.length > 0 && <div className="border-t pt-4"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your latest feedback</p><button type="button" onClick={() => setShowMySubmissions(true)} className="text-xs font-semibold text-blue-600 hover:underline">View all</button></div><div className="space-y-1.5">{myFeedback.slice(0, 3).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-xs"><span className="min-w-0 truncate font-medium">{item.title}</span><span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-muted-foreground">{formatStatus(item.status)}</span></div>)}</div></div>}
            <DialogFooter className="border-t pt-4"><Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button><Button type="submit" disabled={submitting}><Send className="h-4 w-4" />{submitting ? "Sending…" : "Send feedback"}</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function PortalFeedbackLandingCard() {
  return <button type="button" onClick={openPortalFeedback} className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50 via-sky-50 to-blue-50 p-4 text-left shadow-[0_14px_28px_-22px_rgba(30,64,175,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[0_18px_34px_-18px_rgba(37,99,235,0.30)] dark:border-cyan-300/25 dark:from-[#102a42] dark:to-[#112441] dark:shadow-[0_14px_28px_-22px_rgba(0,0,0,0.9)] dark:hover:border-cyan-300/70 dark:hover:shadow-[0_18px_34px_-18px_rgba(8,145,178,0.45)]"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2454ad] to-[#173f91] text-white shadow-[0_8px_16px_-8px_rgba(23,63,145,0.6)] ring-1 ring-white/50 transition duration-300 group-hover:scale-105 dark:from-cyan-400 dark:to-blue-600 dark:shadow-[0_0_22px_-4px_rgba(34,211,238,0.55)]"><Lightbulb className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold dark:text-slate-50">Help improve the portal</span><span className="mt-0.5 block text-xs text-muted-foreground dark:text-slate-300">Share an idea, issue, or usability feedback.</span></span><MessageSquarePlus className="h-5 w-5 text-blue-600 transition-transform group-hover:translate-x-0.5 dark:text-cyan-300" /></button>
}
