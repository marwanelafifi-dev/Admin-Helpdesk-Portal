"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { EventPayloadSchema } from "./event.schema"
import { submitRequest, updateRequest, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { filesToAttachments } from "@/lib/attachments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar, Upload, X, MapPin, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getList } from "@/lib/companyDataStore"

const BRAND = "#ea580c" // orange-600

const FLOOR_OPTIONS = [
  "Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "4th Floor",
  "5th Floor", "6th Floor", "7th Floor", "8th Floor", "9th Floor", "10th Floor",
]

const AREA_OPTIONS = [
  "Conference Room A", "Conference Room B", "Meeting Room 1", "Meeting Room 2",
  "Open Space", "Cafeteria", "Training Room", "Board Room",
]

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

export function EventForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  useEffect(() => { setDepartments(getList("departments")) }, [])

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<EventForm>({
    resolver: zodResolver(EventPayloadSchema) as any,
    defaultValues: { attachments: [], ccEmails: [] },
  })

  const eventLocationType = useWatch({ control, name: "eventLocationType" })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        description: payload.description || "",
        eventLocationType: payload.eventLocationType || undefined,
        floorNumber: payload.floorNumber || "",
        area: payload.area || "",
        addressOrUrl: payload.addressOrUrl || "",
        eventDate: payload.eventDate || "",
        eventTime: payload.eventTime || "",
        expectedAttendees: payload.expectedAttendees || 1,
        department: payload.department || "",
        organizer: payload.organizer || "",
        budget: payload.budget || 0,
        notes: payload.notes || "",
        ccEmails: payload.ccEmails || [],
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/event"))

  const onSubmit = async (data: EventForm) => {
    let redirectTo: string | null = null
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, data, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        const attachments = await filesToAttachments(uploadedFiles, "event")
        const newReq = submitRequest("event", { ...data, attachments } as any, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })
        createNewRequestNotifications({
          requestId: newReq.id,
          requestTitle: newReq.title,
          module: "event",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
        })
      }
      redirectTo = "/event"
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Card 1 — Request Details */}
        <Card>
          <SectionHeader icon={Calendar} title="Request Details" subtitle="Basic information about your event request" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input
                id="requestTitle"
                placeholder="e.g. Q2 Team Building Event"
                {...register("requestTitle")}
                className={cn(errors.requestTitle && "border-red-400")}
              />
              <FieldError message={errors.requestTitle?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide details about your request..."
                rows={4}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Event Type */}
        <Card>
          <SectionHeader icon={Building2} title="Event Type" subtitle="Select whether this is an internal or external event" />
          <CardContent className="space-y-4">
            {/* Mutually-exclusive checkbox pair */}
            <div className="space-y-2">
              {(["internal", "external"] as const).map((type) => {
                const checked = eventLocationType === type
                const label = type === "internal" ? "Internal Event" : "External Event"
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue("eventLocationType", type, { shouldValidate: true })}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all",
                      checked
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-colors",
                        checked ? "border-orange-500 bg-orange-500" : "border-gray-300 bg-white"
                      )}
                    >
                      {checked && (
                        <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className={cn("text-sm font-medium", checked ? "text-orange-700" : "text-gray-700")}>
                      {label}
                    </span>
                  </button>
                )
              })}
              <FieldError message={errors.eventLocationType?.message} />
            </div>

            {/* Internal Event — Floor + Area */}
            {eventLocationType === "internal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="floorNumber">Floor Number <span className="text-red-500">*</span></Label>
                  <Controller
                    name="floorNumber"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="floorNumber"
                        className={cn(
                          "w-full h-10 rounded-md border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          errors.floorNumber ? "border-red-400" : "border-input"
                        )}
                      >
                        <option value="">Select floor</option>
                        {FLOOR_OPTIONS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError message={errors.floorNumber?.message} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="area">Area <span className="text-red-500">*</span></Label>
                  <Controller
                    name="area"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        id="area"
                        className={cn(
                          "w-full h-10 rounded-md border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                          errors.area ? "border-red-400" : "border-input"
                        )}
                      >
                        <option value="">Select area</option>
                        {AREA_OPTIONS.map((a) => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    )}
                  />
                  <FieldError message={errors.area?.message} />
                </div>
              </div>
            )}

            {/* External Event — Address / Location URL */}
            {eventLocationType === "external" && (
              <div className="space-y-1.5 pt-2">
                <Label htmlFor="addressOrUrl">Address / Location URL <span className="text-red-500">*</span></Label>
                <Input
                  id="addressOrUrl"
                  placeholder="Enter venue address or paste a location URL"
                  {...register("addressOrUrl")}
                  className={cn(errors.addressOrUrl && "border-red-400")}
                />
                <FieldError message={errors.addressOrUrl?.message} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card 3 — Event Details */}
        <Card>
          <SectionHeader icon={MapPin} title="Event Details" subtitle="Date, attendees, department, and budget" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="eventDate">Event Date <span className="text-red-500">*</span></Label>
                <Input
                  id="eventDate"
                  type="date"
                  {...register("eventDate")}
                  className={cn(errors.eventDate && "border-red-400")}
                />
                <FieldError message={errors.eventDate?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="eventTime">Event Time</Label>
                <Input id="eventTime" type="time" {...register("eventTime")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="expectedAttendees">Expected Attendees <span className="text-red-500">*</span></Label>
                <Input
                  id="expectedAttendees"
                  type="number"
                  min="1"
                  placeholder="e.g. 50"
                  {...register("expectedAttendees", { valueAsNumber: true })}
                  className={cn(errors.expectedAttendees && "border-red-400")}
                />
                <FieldError message={errors.expectedAttendees?.message} />
              </div>
              <div className="space-y-1.5">
                <Label>Department <span className="text-red-500">*</span></Label>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={departments}
                      placeholder="Select department"
                      hasError={!!errors.department}
                    />
                  )}
                />
                <FieldError message={errors.department?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="organizer">Organizer Name <span className="text-red-500">*</span></Label>
                <Input
                  id="organizer"
                  placeholder="Primary contact for this event"
                  {...register("organizer")}
                  className={cn(errors.organizer && "border-red-400")}
                />
                <FieldError message={errors.organizer?.message} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="budget">Budget (EGP) <span className="text-red-500">*</span></Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...register("budget", { valueAsNumber: true })}
                  className={cn(errors.budget && "border-red-400")}
                />
                <FieldError message={errors.budget?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — Attachments */}
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
                  if (e.target.files) setUploadedFiles(Array.from(e.target.files))
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

        {/* Card 5 — CC Notifications */}
        <Card>
          <SectionHeader icon={Calendar} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
          <CardContent>
            <Controller
              control={control}
              name="ccEmails"
              render={({ field }) => (
                <CcEmailsField value={field.value ?? []} onChange={field.onChange} />
              )}
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="form-footer border-t bg-gray-50 py-4 px-1 flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: BRAND }}
            className="text-white hover:opacity-90 min-w-[160px]"
          >
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default EventForm
