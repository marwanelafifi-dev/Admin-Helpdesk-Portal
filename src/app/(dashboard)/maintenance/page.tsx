import { Wrench, Plus, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function MaintenancePage() {
  const stats = [
    { label: "Open Tickets", value: 8, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "In Progress", value: 3, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Resolved", value: 24, color: "text-green-600", bg: "bg-green-50" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Submit and track maintenance requests
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Maintenance Request
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                <Wrench className={`h-6 w-6 ${s.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Maintenance Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <Wrench className="h-12 w-12 mb-4 text-slate-300" />
            <p className="font-medium">Maintenance module coming soon</p>
            <p className="text-sm mt-1">
              Ticket list, assignment, and resolution tracking will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
