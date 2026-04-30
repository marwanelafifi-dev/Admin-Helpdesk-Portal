"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, type Resolver } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  TravelPayloadSchema,
  type TravelPayload,
  TRAVEL_TYPES,
  TRANSPORTATION_MODES,
  HOTEL_CLASSES,
} from "./travel.schema"
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
  Plane,
  MapPin,
  Calendar,
  Users,
  Hotel,
  ClipboardList,
  Upload,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#0891B2" // cyan-600

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

export function TravelForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TravelPayload>({
    resolver: zodResolver(TravelPayloadSchema) as unknown as Resolver<TravelPayload>,
    defaultValues: {
      hotelRequired: false,
      mealAllowance: false,
    },
  })

  const hotelRequired = watch("hotelRequired")

  const onSubmit = async (data: TravelPayload) => {
    await createRequest("travel", data as unknown as Record<string, unknown>, {
      title: `Travel – ${data.tripName}`,
      requesterId: session?.user?.id ?? "USR-CURRENT",
      requesterName: session?.user?.name ?? "Current User",
      requesterEmail: session?.user?.email ?? "",
    })
    router.push("/travel")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Trip Details */}
      <Card>
        <SectionHeader
          icon={Plane}
          title="Trip Details"
          subtitle="Basic information about your travel"
        />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tripName">
              Trip Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="tripName"
              placeholder="e.g. Dubai Client Meeting"
              {...register("tripName")}
              className={cn(errors.tripName && "border-red-400")}
            />
            <FieldError message={errors.tripName?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purpose">
              Travel Purpose <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="purpose"
              placeholder="Business purpose or reason for travel..."
              rows={3}
              {...register("purpose")}
              className={cn(errors.purpose && "border-red-400")}
            />
            <FieldError message={errors.purpose?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="travelType">
                Travel Type <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="travelType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(errors.travelType && "border-red-400")}
                    >
                      <SelectValue placeholder="Select travel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAVEL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.travelType?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department">
                Department <span className="text-red-500">*</span>
              </Label>
              <Input
                id="department"
                placeholder="e.g. Sales, HR, Engineering"
                {...register("department")}
                className={cn(errors.department && "border-red-400")}
              />
              <FieldError message={errors.department?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Destination & Dates */}
      <Card>
        <SectionHeader
          icon={MapPin}
          title="Destination & Dates"
          subtitle="Trip locations and schedule"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="origin">
                Origin <span className="text-red-500">*</span>
              </Label>
              <Input
                id="origin"
                placeholder="e.g. Cairo, Egypt"
                {...register("origin")}
                className={cn(errors.origin && "border-red-400")}
              />
              <FieldError message={errors.origin?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="destination">
                Destination <span className="text-red-500">*</span>
              </Label>
              <Input
                id="destination"
                placeholder="e.g. Dubai, UAE"
                {...register("destination")}
                className={cn(errors.destination && "border-red-400")}
              />
              <FieldError message={errors.destination?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="departureDate">
                Departure Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="departureDate"
                type="date"
                {...register("departureDate")}
                className={cn(errors.departureDate && "border-red-400")}
              />
              <FieldError message={errors.departureDate?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="returnDate">
                Return Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="returnDate"
                type="date"
                {...register("returnDate")}
                className={cn(errors.returnDate && "border-red-400")}
              />
              <FieldError message={errors.returnDate?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transportation & Accommodation */}
      <Card>
        <SectionHeader
          icon={Plane}
          title="Transportation & Accommodation"
          subtitle="Mode of transport and accommodation details"
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="transportationMode">
                Transportation Mode <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="transportationMode"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className={cn(
                        errors.transportationMode && "border-red-400"
                      )}
                    >
                      <SelectValue placeholder="Select transportation" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSPORTATION_MODES.map((mode) => (
                        <SelectItem key={mode} value={mode}>
                          {mode}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.transportationMode?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="numberOfTravelers">
                Number of Travelers <span className="text-red-500">*</span>
              </Label>
              <Input
                id="numberOfTravelers"
                type="number"
                placeholder="Number of people"
                {...register("numberOfTravelers", { valueAsNumber: true })}
                className={cn(errors.numberOfTravelers && "border-red-400")}
              />
              <FieldError message={errors.numberOfTravelers?.message} />
            </div>
          </div>

          {/* Hotel Section */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hotelRequired}
                {...register("hotelRequired")}
                className="h-4 w-4 accent-cyan-600"
              />
              <span className="text-sm font-medium">Hotel Accommodation Required</span>
            </label>

            {hotelRequired && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                <div className="space-y-1.5">
                  <Label htmlFor="hotelClass">Hotel Class</Label>
                  <Controller
                    name="hotelClass"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select hotel class" />
                        </SelectTrigger>
                        <SelectContent>
                          {HOTEL_CLASSES.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={watch("mealAllowance")}
                {...register("mealAllowance")}
                className="h-4 w-4 accent-cyan-600"
              />
              <span className="text-sm font-medium">Meal Allowance Required</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Approval & Budget */}
      <Card>
        <SectionHeader
          icon={Users}
          title="Approval & Budget"
          subtitle="Manager approval and estimated costs"
        />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="manager">
              Manager <span className="text-red-500">*</span>
            </Label>
            <Input
              id="manager"
              placeholder="Manager name (for approval)"
              {...register("manager")}
              className={cn(errors.manager && "border-red-400")}
            />
            <FieldError message={errors.manager?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estimatedBudget">Estimated Budget</Label>
            <Input
              id="estimatedBudget"
              type="number"
              placeholder="0.00"
              {...register("estimatedBudget", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="businessJustification">
              Business Justification <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="businessJustification"
              placeholder="Explain the business value and goals of this trip..."
              rows={3}
              {...register("businessJustification")}
              className={cn(errors.businessJustification && "border-red-400")}
            />
            <FieldError message={errors.businessJustification?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <SectionHeader
          icon={Upload}
          title="Attachments"
          subtitle="Upload booking confirmations or documents"
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
              className="w-full px-6 py-8 border-2 border-dashed border-cyan-300 rounded-lg hover:border-cyan-500 hover:bg-cyan-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="h-6 w-6 text-cyan-600 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                Flight tickets, hotel bookings, visas
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
                      className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-cyan-50 border border-cyan-200"
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
                        className="p-1 hover:bg-cyan-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-cyan-600" />
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
          subtitle="Any extra information or special requests"
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
          {isSubmitting ? "Submitting..." : "Submit Travel Request"}
        </Button>
      </div>
    </form>
  )
}
