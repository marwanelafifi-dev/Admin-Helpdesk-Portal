"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  TRAVEL_TYPES,
  TRAVEL_CLASS,
  TravelPayloadSchema,
} from "./travel.schema"
import { submitRequest } from "@/services/engineService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Plane, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"

const BRAND = "#ec4899" // pink-500

type TravelForm = z.infer<typeof TravelPayloadSchema>

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

export function TravelForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<TravelForm>({
    resolver: zodResolver(TravelPayloadSchema),
    defaultValues: { attachments: [], ccEmails: [] },
  })

  const handleCancel = onCancel ?? (() => router.push("/travel"))

  const onSubmit = async (data: TravelForm) => {
    try {
      submitRequest("travel", data, {
        title: data.requestTitle,
        requesterId: session?.user?.id || "USR-001",
        requesterName: session?.user?.name || session?.user?.email || "Current User",
        requesterEmail: session?.user?.email || "user@si-ware.com",
      })
      router.push("/travel")
      router.refresh()
    } catch (error) {
      console.error("Failed to create request:", error)
    }
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Request Title */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input id="requestTitle" placeholder="e.g. Business Trip to Dubai - Q2 Conference" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Travel Details */}
        <Card>
          <SectionHeader icon={Plane} title="Travel Details" subtitle="Flight and destination information" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tripName">Trip Name <span className="text-red-500">*</span></Label>
                <Input id="tripName" placeholder="e.g. Q2 Conference" {...register("tripName")} className={cn(errors.tripName && "border-red-400")} />
                <FieldError message={errors.tripName?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="travelerName">Traveler Name <span className="text-red-500">*</span></Label>
                <Input id="travelerName" placeholder="Full name" {...register("travelerName")} className={cn(errors.travelerName && "border-red-400")} />
                <FieldError message={errors.travelerName?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="travelType">Travel Type <span className="text-red-500">*</span></Label>
                <Controller
                  name="travelType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.travelType && "border-red-400")}>
                        <SelectValue placeholder="Select travel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAVEL_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.travelType?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="flightClass">Flight Class <span className="text-red-500">*</span></Label>
                <Controller
                  name="flightClass"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.flightClass && "border-red-400")}>
                        <SelectValue placeholder="Select flight class" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRAVEL_CLASS.map((cls) => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.flightClass?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="origin">Origin <span className="text-red-500">*</span></Label>
                <Input id="origin" placeholder="e.g. Cairo, Egypt" {...register("origin")} className={cn(errors.origin && "border-red-400")} />
                <FieldError message={errors.origin?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="destination">Destination <span className="text-red-500">*</span></Label>
                <Input id="destination" placeholder="e.g. Dubai, UAE" {...register("destination")} className={cn(errors.destination && "border-red-400")} />
                <FieldError message={errors.destination?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="departureDate">Departure Date <span className="text-red-500">*</span></Label>
                <Input id="departureDate" type="date" {...register("departureDate")} className={cn(errors.departureDate && "border-red-400")} />
                <FieldError message={errors.departureDate?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="returnDate">Return Date</Label>
                <Input id="returnDate" type="date" {...register("returnDate")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purpose">Purpose of Travel <span className="text-red-500">*</span></Label>
              <Textarea id="purpose" placeholder="Explain the business purpose of this trip..." rows={3} {...register("purpose")} className={cn(errors.purpose && "border-red-400")} />
              <FieldError message={errors.purpose?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <SectionHeader icon={Plane} title="Business Information" subtitle="Department and approval details" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
                <Input id="department" placeholder="e.g. Engineering, Sales" {...register("department")} className={cn(errors.department && "border-red-400")} />
                <FieldError message={errors.department?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="approver">Manager Approval <span className="text-red-500">*</span></Label>
                <Input id="approver" placeholder="Manager name" {...register("approver")} className={cn(errors.approver && "border-red-400")} />
                <FieldError message={errors.approver?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estimatedCost">Estimated Cost (EGP) <span className="text-red-500">*</span></Label>
              <Input id="estimatedCost" type="number" min="0" step="0.01" placeholder="0.00" {...register("estimatedCost", { valueAsNumber: true })} className={cn(errors.estimatedCost && "border-red-400")} />
              <FieldError message={errors.estimatedCost?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload itinerary, hotel bookings, or quotes" />
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
                className="w-full px-6 py-8 border-2 border-dashed border-pink-300 rounded-lg hover:border-pink-500 hover:bg-pink-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="h-6 w-6 text-pink-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Itinerary, hotel bookings, or supporting documents</span>
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-pink-50 border border-pink-200">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-pink-200 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-pink-600" />
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
          <SectionHeader icon={Plane} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={Plane} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
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

        <div className="border-t bg-gray-50 py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={true} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px] opacity-50 cursor-not-allowed">
            Coming Soon
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TravelForm
