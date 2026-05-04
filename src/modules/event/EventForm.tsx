"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  EVENT_TYPES,
  EventPayloadSchema,
} from "./event.schema"
import { requestsAPI } from "@/lib/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Calendar, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#ea580c" // orange-600

type EventForm = z.infer<typeof EventPayloadSchema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${BRAND}18` }}>
          <Icon className="h-5 w-5" style={{ color: BRAND }} />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </CardHeader>
  )
}

export function EventForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<EventForm>({
    resolver: zodResolver(EventPayloadSchema),
    defaultValues: { attachments: [] },
  })

  const handleCancel = onCancel ?? (() => router.push("/event"))

  const onSubmit = async (data: EventForm) => {
    try {
      await requestsAPI.create("event", {
        title: data.requestTitle,
        payload: data,
        requesterId: "USR-001",
      })
      router.push("/event")
      router.refresh()
    } catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-12">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Request Title */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input id="requestTitle" placeholder="e.g. Q2 Team Building Event" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Event Details */}
        <Card>
          <SectionHeader icon={Calendar} title="Event Details" subtitle="Basic event information" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="eventName">Event Name <span className="text-red-500">*</span></Label>
              <Input id="eventName" placeholder="e.g. Annual Team Offsite" {...register("eventName")} className={cn(errors.eventName && "border-red-400")} />
              <FieldError message={errors.eventName?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eventType">Event Type <span className="text-red-500">*</span></Label>
              <Controller
                name="eventType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.eventType && "border-red-400")}>
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.eventType?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="Describe the event, agenda, and objectives..." rows={4} {...register("description")} className={cn(errors.description && "border-red-400")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Event Date <span className="text-red-500">*</span></Label>
                <Input id="eventDate" type="date" {...register("eventDate")} className={cn(errors.eventDate && "border-red-400")} />
                <FieldError message={errors.eventDate?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="eventTime">Event Time</Label>
                <Input id="eventTime" type="time" {...register("eventTime")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="location">Location <span className="text-red-500">*</span></Label>
                <Input id="location" placeholder="e.g. Convention Center, Venue Name" {...register("location")} className={cn(errors.location && "border-red-400")} />
                <FieldError message={errors.location?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="expectedAttendees">Expected Attendees <span className="text-red-500">*</span></Label>
                <Input id="expectedAttendees" type="number" min="1" placeholder="50" {...register("expectedAttendees", { valueAsNumber: true })} className={cn(errors.expectedAttendees && "border-red-400")} />
                <FieldError message={errors.expectedAttendees?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organizational Details */}
        <Card>
          <SectionHeader icon={Calendar} title="Organizational Details" subtitle="Department and organizer information" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                <Input id="department" placeholder="e.g. Engineering, Sales" {...register("department")} className={cn(errors.department && "border-red-400")} />
                <FieldError message={errors.department?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organizer">Organizer Name <span className="text-red-500">*</span></Label>
                <Input id="organizer" placeholder="Primary contact for this event" {...register("organizer")} className={cn(errors.organizer && "border-red-400")} />
                <FieldError message={errors.organizer?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (EGP) <span className="text-red-500">*</span></Label>
              <Input id="budget" type="number" min="0" step="0.01" placeholder="0.00" {...register("budget", { valueAsNumber: true })} className={cn(errors.budget && "border-red-400")} />
              <FieldError message={errors.budget?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload agenda, venue details, or quotes" />
          <CardContent>
            <div className="space-y-3">
              <input
                id="attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    setUploadedFiles(Array.from(e.target.files))
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("attachments")?.click()}
                className="w-full px-6 py-8 border-2 border-dashed border-orange-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Agenda, venue details, or supporting documents</span>
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-orange-50 border border-orange-200">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-orange-200 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-orange-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Optional: Upload supporting documents for faster approval</p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <SectionHeader icon={Calendar} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
          </CardContent>
        </Card>

        <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={true} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px] opacity-50 cursor-not-allowed">
            Coming Soon
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EventForm
