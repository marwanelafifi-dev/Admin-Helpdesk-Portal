"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import InvoicePaymentForm from "@/modules/finance/InvoicePaymentForm"
import { getRequests, type EngineRequest } from "@/services/engineService"
import { FirstRequestGuide } from "@/components/help/FirstRequestGuide"

export default function NewInvoicePaymentRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)

  useEffect(() => {
    if (requestId) {
      const requests = getRequests()
      const request = requests.find((r) => r.id === requestId)
      if (request) setExistingRequest(request)
    }
  }, [requestId])

  const isEditing = !!requestId
  const title = isEditing ? "Edit Pre Paid Invoice Request" : "New Pre Paid Invoice Request"
  const subtitle = isEditing ? "Update the pre paid invoice request details" : "Submit a pre paid vendor invoice"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{subtitle}</p>
      </div>
      <FirstRequestGuide moduleId="finance_invoice_payment" isEditing={isEditing} />

      <InvoicePaymentForm
        onCancel={() => router.push("/departments/finance/invoices")}
        editingRequest={existingRequest}
        isEditing={isEditing}
      />
    </div>
  )
}
