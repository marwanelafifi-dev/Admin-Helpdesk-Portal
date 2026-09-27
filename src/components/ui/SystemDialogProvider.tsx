"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DialogKind = "info" | "success" | "error"

type DialogEventDetail = {
  title?: string
  message: string
  kind?: DialogKind
}

const EVENT_NAME = "portal:system-alert"

/** Show a portal-styled information, success, or error dialog. */
export function showSystemAlert(message: string, options: Omit<DialogEventDetail, "message"> = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<DialogEventDetail>(EVENT_NAME, {
    detail: { message, ...options },
  }))
}

export function SystemDialogProvider() {
  const [dialog, setDialog] = useState<DialogEventDetail | null>(null)

  useEffect(() => {
    const handleAlert = (event: Event) => {
      const detail = (event as CustomEvent<DialogEventDetail>).detail
      if (detail?.message) setDialog(detail)
    }
    window.addEventListener(EVENT_NAME, handleAlert)

    // Legacy calls such as alert("Password reset successfully") now receive
    // the same portal styling without forcing every screen to change at once.
    const nativeAlert = window.alert
    window.alert = (message?: unknown) => showSystemAlert(String(message ?? ""))

    return () => {
      window.removeEventListener(EVENT_NAME, handleAlert)
      window.alert = nativeAlert
    }
  }, [])

  const kind = dialog?.kind ?? "info"
  const appearance = {
    info: { title: dialog?.title ?? "Notice", icon: Info, iconClass: "bg-blue-100 text-blue-700", border: "border-blue-200" },
    success: { title: dialog?.title ?? "Success", icon: CheckCircle2, iconClass: "bg-emerald-100 text-emerald-700", border: "border-emerald-200" },
    error: { title: dialog?.title ?? "Something needs attention", icon: AlertTriangle, iconClass: "bg-red-100 text-red-700", border: "border-red-200" },
  }[kind]
  const Icon = appearance.icon

  return (
    <Dialog open={!!dialog} onOpenChange={(open) => { if (!open) setDialog(null) }}>
      <DialogContent className={`max-w-md border p-0 ${appearance.border}`}>
        <DialogHeader className="rounded-t-lg border-b border-slate-100 bg-slate-50 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${appearance.iconClass}`}><Icon className="h-5 w-5" /></div>
            <DialogTitle className="text-base text-slate-900">{appearance.title}</DialogTitle>
          </div>
        </DialogHeader>
        <DialogDescription className="whitespace-pre-wrap px-6 pt-5 text-sm leading-6 text-slate-600">
          {dialog?.message}
        </DialogDescription>
        <DialogFooter className="px-6 pb-6 pt-2">
          <Button type="button" onClick={() => setDialog(null)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
