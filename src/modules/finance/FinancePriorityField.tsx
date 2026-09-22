"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Info } from "lucide-react"
import { financeSlaNote, FINANCE_MISSING_DOCS_NOTE, FINANCE_PROCESSING_DAYS, normalizeFinanceSlaDays } from "./financeSla"

/** Processing timeline shared by every Finance request form. */
export function FinanceProcessingNotice({ hasApproval = false }: { hasApproval?: boolean }) {
  const [processingDays, setProcessingDays] = useState(FINANCE_PROCESSING_DAYS)

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.settings) setProcessingDays(normalizeFinanceSlaDays(data.settings.financeSlaWorkingDays))
      })
      .catch(() => {})
  }, [])

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-base">Processing Time &amp; Requirements</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">When processing starts and how missing documents affect completion.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500 bg-amber-50 px-3 py-2.5">
          <Clock className="h-4 w-4 flex-shrink-0 text-amber-600" />
          <p className="text-xs font-semibold text-amber-900">{financeSlaNote(hasApproval, processingDays)}</p>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
          <Info className="h-4 w-4 flex-shrink-0 text-blue-600" />
          <p className="text-xs font-semibold text-blue-900">Finance working hours are Sunday–Thursday, 9:00 AM–6:00 PM (Cairo time). Requests submitted after 6:00 PM are treated as received on the next working day.</p>
        </div>
        <div className="flex items-start gap-2 border-t pt-3">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">{FINANCE_MISSING_DOCS_NOTE}</p>
        </div>
      </CardContent>
    </Card>
  )
}
