import { CalendarDays, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function EventPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Event</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Plan and manage corporate event requests
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Event Request
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Upcoming Events", value: 4, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Pending Approval", value: 2, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Completed", value: 11, color: "text-green-600", bg: "bg-green-50" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
                <CalendarDays className={`h-6 w-6 ${s.color}`} />
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
          <CardTitle className="text-base">Event Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <CalendarDays className="h-12 w-12 mb-4 text-slate-300" />
            <p className="font-medium">Event module coming soon</p>
            <p className="text-sm mt-1">
              Event planning, venue booking, and budget tracking will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
