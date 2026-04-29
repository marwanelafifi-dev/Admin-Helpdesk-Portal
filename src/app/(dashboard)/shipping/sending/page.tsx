import { Truck } from "lucide-react"

export default function SendingPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sending</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Track outgoing shipments and deliveries</p>
        </div>
      </div>

      {/* Coming Soon Message */}
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Truck className="h-16 w-16 mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Sending Module Coming Soon</h2>
        <p className="text-muted-foreground max-w-md">
          The Sending module is being prepared and will be available shortly. Stay tuned for updates!
        </p>
      </div>
    </div>
  )
}
