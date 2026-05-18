"use client"

import { useRouter } from "next/navigation"
import PurchaseForm from "@/modules/purchase/PurchaseForm"
import { ShoppingCart } from "lucide-react"

export default function NewPurchaseRequestPage() {
  const router = useRouter()

  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div>
          <h1>New Purchase Request</h1>
          <p>
          Submit a purchase request for items from Amazon, Noon, or other suppliers
          </p>
        </div>
      </div>

      <PurchaseForm onCancel={() => router.push("/purchase")} />
    </div>
  )
}
