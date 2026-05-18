import { ArrowLeft, Package } from "lucide-react"
import Link from "next/link"
import ShippingForm from "@/modules/shipping/ShippingForm"

export default function NewShippingRequestPage() {
  return (
    <div className="request-page space-y-6">
      <div className="request-page-header">
        <div className="request-page-header-icon">
          <Package className="h-5 w-5" />
        </div>
        <div>
        <Link
          href="/shipping"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipping
        </Link>
          <h1>New Shipping Request</h1>
          <p>Fill in the details below and submit for approval</p>
        </div>
      </div>

      <ShippingForm />
    </div>
  )
}
