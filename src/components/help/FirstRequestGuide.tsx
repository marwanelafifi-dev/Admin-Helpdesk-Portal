"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, ClipboardList, Info } from "lucide-react"
import { getModuleGuide } from "@/lib/helpGuidance"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function FirstRequestGuide({ moduleId, isEditing = false }: { moduleId: string; isEditing?: boolean }) {
  const [open, setOpen] = useState(false)
  const [firstRequest, setFirstRequest] = useState(false)
  const guide = getModuleGuide(moduleId)

  useEffect(() => {
    if (isEditing || !guide) return
    let active = true
    fetch(`/api/help/journey?module=${encodeURIComponent(moduleId)}`, { credentials: "include" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.shouldShow) {
          setFirstRequest(true)
          setOpen(true)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [guide, isEditing, moduleId])

  if (!guide) return null

  async function closeGuide() {
    setOpen(false)
    if (firstRequest) {
      setFirstRequest(false)
      await fetch(`/api/help/journey?module=${encodeURIComponent(moduleId)}`, { method: "POST", credentials: "include" }).catch(() => {})
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void closeGuide(); else setOpen(true) }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-blue-600" /> Your first {guide.label} request</DialogTitle>
          <DialogDescription>{guide.summary}</DialogDescription>
        </DialogHeader>
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 font-semibold text-slate-900"><Info className="h-4 w-4 text-blue-600" /> Before you submit</div>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {guide.notes.map((note) => <li key={note} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /><span>{note}</span></li>)}
          </ul>
        </section>
        <p className="text-sm text-slate-600"><span className="font-medium text-slate-800">After you submit: </span>{guide.afterSubmit}</p>
        <p className="text-xs text-muted-foreground">You can reopen these notes from the Help icon beside your account name.</p>
        <DialogFooter><Button onClick={() => void closeGuide()}>I understand</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
