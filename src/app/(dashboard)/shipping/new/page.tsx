import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import ShippingForm from "@/modules/shipping/ShippingForm"

export default function NewShippingRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/shipping"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shipping
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">New Shipping Request</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Fill in the details below and submit for approval
        </p>
      </div>

      <ShippingForm />
    </div>
  )
}
