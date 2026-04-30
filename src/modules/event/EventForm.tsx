"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  EventPayloadSchema,
  type EventPayload,
  EVENT_TYPES,
  VENUE_TYPES,
} from "./event.schema"
import { createRequest } from "@/lib/requests-api"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertCircle,
  Calendar,
  MapPin,
  Users,
  ClipboardList,
  Upload,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#7C3AED" // violet-600

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      {message}
    </p>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
}) {
  return (
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${BRAND}18` }}
        >
          <Icon className="h-5 w-5" style={{ color: BRAND }} />
        </div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </CardHeader>
  )
}

export function EventForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventPayload>({
    resolver: zodResolver(EventPayloadSchema),
  })

  const onSubmit = async (data: EventPayload) => {
    await createRequest("event", data as unknown as Record<string, unknown>, {
      title: `Event – ${data.eventName}`,
      requesterId: session?.user?.id ?? "USR-CURRENT",
      requesterName: session?.user?.name ?? "Current User",
      requesterEmail: session?.user?.email ?? "",
    })
    router.push("/event")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Event Details */}
      <Card>
        <SectionHeader
          icon={Calendar}
          title="Event Details"
          subtitle="Basic information about your event"
        />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="eventName">
              Event Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="eventName"
              placeholder="e.g. Annual Team Building Event"
              {...register("eventName")}
              className={cn(errors.eventName && "border-red-400")}
            />
            <FieldError message={errors.eventName?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the event..."
              rows={3}
              {...register("description")}
              className={cn(errors.description && "border-red-400")}
            />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eventType">
                Event Type <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="eventType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(errors.eventType && "border-red-400")}
                    >
                      <SelectValue placeholder="Select event type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.eventType?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">
                Department <span className="text-red-500">*</span>
              </Label>
              <Input
                id="department"
                placeholder="e.g. HR, Sales, Engineering"
                {...register("department")}
                className={cn(errors.department && "border-red-400")}
              />
              <FieldError message={errors.department?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date & Time */}
      <Card>
        <SectionHeader
          icon={Calendar}
          title="Date & Time"
          subtitle="Schedule your event"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eventDate">
                Event Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="eventDate"
                type="date"
                {...register("eventDate")}
                className={cn(errors.eventDate && "border-red-400")}
              />
              <FieldError message={errors.eventDate?.message} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  {...register("startTime")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  {...register("endTime")}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Venue Details */}
      <Card>
        <SectionHeader
          icon={MapPin}
          title="Venue Details"
          subtitle="Location and attendee information"
        />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="venue">
              Venue <span className="text-red-500">*</span>
            </Label>
            <Input
              id="venue"
              placeholder="e.g. Hilton Hotel, Conference Room A"
              {...register("venue")}
              className={cn(errors.venue && "border-red-400")}
            />
            <FieldError message={errors.venue?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="venueType">
                Venue Type <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="venueType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(errors.venueType && "border-red-400")}
                    >
                      <SelectValue placeholder="Select venue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.venueType?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expectedAttendees">
                Expected Attendees <span className="text-red-500">*</span>
              </Label>
              <Input
                id="expectedAttendees"
                type="number"
                placeholder="Number of attendees"
                {...register("expectedAttendees", { valueAsNumber: true })}
                className={cn(errors.expectedAttendees && "border-red-400")}
              />
              <FieldError message={errors.expectedAttendees?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                placeholder="Full name"
                {...register("contactPerson")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                placeholder="+1 (555) 000-0000"
                {...register("contactPhone")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget & Special Requirements */}
      <Card>
        <SectionHeader
          icon={Users}
          title="Budget & Requirements"
          subtitle="Budget allocation and special needs"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (Optional)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="0.00"
                {...register("budget", { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specialRequirements">
              Special Requirements
            </Label>
            <Textarea
              id="specialRequirements"
              placeholder="Catering, equipment, accessibility needs, etc..."
              rows={3}
              {...register("specialRequirements")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <SectionHeader
          icon={Upload}
          title="Attachments"
          subtitle="Upload documents or reference materials"
        />
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
              className="w-full px-6 py-8 border-2 border-dashed border-violet-300 rounded-lg hover:border-violet-500 hover:bg-violet-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="h-6 w-6 text-violet-600 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                Agendas, schedules, or documents
              </span>
            </button>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">
                  {uploadedFiles.length} file(s) selected:
                </p>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-violet-50 border border-violet-200"
                    >
                      <span className="text-sm text-gray-700 truncate">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadedFiles(
                            uploadedFiles.filter((_, i) => i !== idx)
                          )
                        }
                        className="p-1 hover:bg-violet-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-violet-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Optional: Upload supporting documents
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader
          icon={ClipboardList}
          title="Additional Notes"
          subtitle="Any extra information"
        />
        <CardContent>
          <Textarea
            placeholder="Optional notes..."
            rows={3}
            {...register("notes")}
          />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: BRAND }}
          className="text-white hover:opacity-90 min-w-[160px]"
        >
          {isSubmitting ? "Submitting..." : "Submit Event Request"}
        </Button>
      </div>
    </form>
  )
}
