"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpen, CheckCircle2, CircleHelp, ClipboardList, ExternalLink, FileText, ShieldCheck } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { canAccessPath } from "@/lib/access"
import { PAGES, type PageDefinition } from "@/lib/pageRegistry"
import { MODULE_GUIDES, getModuleGuideForPath } from "@/lib/helpGuidance"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ROUTE_GUIDANCE: Record<string, string> = {
  dashboard: "Review the team overview, current work, and items requiring attention.",
  "my-requests": "Track requests you submitted and open an item to follow its progress.",
  "team-requests": "Review requests shared with your team and take the actions your role permits.",
  "all-requests": "Use filters and request details to manage the full team queue.",
  tasks: "Review assigned tasks, update progress, and keep work moving.",
  "feedback-reports": "Review feedback and reporting data available to your function.",
  "admin-users": "Create and maintain accounts. Give each person only the role and access they need.",
  "admin-roles": "Configure role permissions. Changes determine which pages and actions users can access.",
  "admin-roles-buchi": "Configure BUCHI roles and page permissions.",
  "admin-settings": "Manage platform configuration. Review changes carefully before saving.",
  "admin-audit": "Review security and activity history for accountability.",
  "admin-database": "Use database tools only when you understand the operational impact.",
  "admin-notifications": "Configure notification behavior and templates available to the platform.",
}

function matchesPage(pathname: string, page: PageDefinition) {
  const pattern = page.path.replace(/\[.*?\]/g, "[^/]+")
  return new RegExp(`^${pattern}(?:/|$)`).test(pathname)
}

function pageGuidance(page: PageDefinition) {
  return ROUTE_GUIDANCE[page.id] ?? `Use ${page.label} to complete the ${page.group?.toLowerCase() ?? "assigned"} work available to your role.`
}

export function JourneyManual() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [firstVisit, setFirstVisit] = useState(false)
  const [checking, setChecking] = useState(true)
  const permissions = session?.user?.permissions ?? []
  const role = session?.user?.role

  const availablePages = useMemo(
    () => PAGES.filter((page) => page.assignable !== false && canAccessPath(page.path, permissions, role)),
    [permissions, role],
  )
  const currentPage = useMemo(
    () => [...availablePages].sort((a, b) => b.path.length - a.path.length).find((page) => matchesPage(pathname, page)),
    [availablePages, pathname],
  )
  const currentModule = useMemo(() => getModuleGuideForPath(pathname), [pathname])
  const availableModules = useMemo(
    () => MODULE_GUIDES.filter((guide) => guide.paths.some((path) => canAccessPath(path, permissions, role))),
    [permissions, role],
  )

  useEffect(() => {
    if (status !== "authenticated") return
    let active = true
    fetch("/api/help/journey", { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.shouldShow) {
          setFirstVisit(true)
          setOpen(true)
        }
      })
      .catch(() => {})
      .finally(() => active && setChecking(false))
    return () => { active = false }
  }, [status])

  async function closeManual() {
    setOpen(false)
    if (firstVisit) {
      setFirstVisit(false)
      await fetch("/api/help/journey", { method: "POST", credentials: "include" }).catch(() => {})
    }
  }

  function openPage(page: PageDefinition) {
    void closeManual()
    router.push(page.path)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="Help and user guide"
        aria-label="Open help and user guide"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        <CircleHelp className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next) void closeManual(); else setOpen(true) }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-600" /> Your user journey</DialogTitle>
            <DialogDescription>
              This guide shows only the pages your current role can access. You can reopen it any time from the Help icon beside your name.
            </DialogDescription>
          </DialogHeader>

          {currentPage && (
            <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">You are here</p>
              <h3 className="mt-1 font-semibold text-slate-900">{currentPage.label}</h3>
              <p className="mt-1 text-sm text-slate-700">{pageGuidance(currentPage)}</p>
            </section>
          )}

          {currentModule && (
            <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Current request module · {currentModule.function}</p>
              <h3 className="mt-1 font-semibold text-slate-900">{currentModule.label}</h3>
              <p className="mt-1 text-sm text-slate-700">{currentModule.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {currentModule.notes.map((note) => <li key={note} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{note}</li>)}
              </ul>
              <p className="mt-3 text-sm text-slate-700"><span className="font-medium">After you submit: </span>{currentModule.afterSubmit}</p>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /><h3 className="font-semibold">How to work in the portal</h3></div>
            <ol className="grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              <li className="rounded-md bg-slate-50 p-3"><strong>1. Choose a service</strong><br />Open the function or service you need from the navigation.</li>
              <li className="rounded-md bg-slate-50 p-3"><strong>2. Complete the request</strong><br />Provide accurate details and submit. Use My Requests to follow it.</li>
              <li className="rounded-md bg-slate-50 p-3"><strong>3. Take role actions</strong><br />Approvals, updates, and administration appear only when permitted.</li>
            </ol>
          </section>

          {availablePages.some((page) => page.group === "Admin") && (
            <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <div className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Platform Administration</div>
              <p className="mt-1">Administrative guidance below includes only the platform pages you are authorized to open. Role and settings changes affect other users immediately.</p>
            </section>
          )}

          <section>
            <div className="mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-slate-600" /><h3 className="font-semibold">Request module reference</h3></div>
            <p className="mb-3 text-sm text-slate-600">Each module includes its own submission notes. Open a module to start a request.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {availableModules.map((guide) => (
                <button key={guide.id} onClick={() => { void closeManual(); router.push(guide.startPath) }} className="group rounded-lg border p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50">
                  <span className="flex items-start justify-between gap-3 font-medium text-slate-900">{guide.label}<ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" /></span>
                  <span className="mt-1 block text-xs font-medium text-blue-700">{guide.function} function</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{guide.summary}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-slate-600" /><h3 className="font-semibold">Your available pages</h3></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {availablePages.map((page) => (
                <button key={page.id} onClick={() => openPage(page)} className="group rounded-lg border p-3 text-left transition-colors hover:border-blue-300 hover:bg-blue-50">
                  <span className="flex items-start justify-between gap-3 font-medium text-slate-900">{page.label}<ExternalLink className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" /></span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{pageGuidance(page)}</span>
                </button>
              ))}
            </div>
          </section>
          <DialogFooter>
            <Button onClick={() => void closeManual()}>{firstVisit ? "Got it" : "Close guide"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
