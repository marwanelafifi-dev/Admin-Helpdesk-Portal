"use client"

import { useRouter } from "next/navigation"
import PurchaseForm from "@/modules/purchase/PurchaseForm"

export default function NewPurchaseRequestPage() {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Purchase Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Submit a purchase request for items from Amazon, Noon, or other suppliers
        </p>
      </div>

      {/* Form */}
      <PurchaseForm onCancel={() => router.push("/purchase")} />
    </div>
  )
}
