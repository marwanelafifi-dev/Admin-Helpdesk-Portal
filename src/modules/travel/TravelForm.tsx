"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TravelFormSchema, type TravelForm as TravelFormType } from "./travel.schema"
import { submitRequest, addAutoCc } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { filesToAttachments } from "@/lib/attachments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Plane, Upload, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { MarkdownEditor } from "@/components/ui/MarkdownEditor"
import { getList } from "@/lib/companyDataStore"

const BRAND = "#14b8a6" // teal-500

type FormData = TravelFormType

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

function AttachmentUploadZone({ label, required = false, onChange, value }: { label: string; required?: boolean; onChange: (file: File | null) => void; value?: File }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <input
          type="file"
          className="hidden"
          id={`upload-${label}`}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => document.getElementById(`upload-${label}`)?.click()}
          className="w-full px-4 py-6 border-2 border-dashed rounded-lg hover:bg-opacity-40 transition-all flex flex-col items-center justify-center gap-1.5 group"
          style={{
            borderColor: BRAND,
            backgroundColor: `${BRAND}08`,
          }}
        >
          <Upload className="h-5 w-5 group-hover:scale-110 transition-transform" style={{ color: BRAND }} />
          <span className="text-sm font-medium text-gray-700">
            {value ? value.name : "Click to browse"}
          </span>
          <span className="text-xs text-muted-foreground">
            {value ? `${(value.size / 1024 / 1024).toFixed(2)} MB` : "Select a file"}
          </span>
        </button>
      </div>
    </div>
  )
}

export function TravelForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [managers, setManagers] = useState<string[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  const [travelType, setTravelType] = useState<"visa_application" | "hotel_flight_reservation">("visa_application")

  // File states for Visa Application
  const [visaDocFile, setVisaDocFile] = useState<File | null>(null)
  const [amanStickerFile, setAmanStickerFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])

  // File states for Hotel & Flight
  const [formFile, setFormFile] = useState<File | null>(null)
  const [amanStickerFile2, setAmanStickerFile2] = useState<File | null>(null)
  const [passportFile2, setPassportFile2] = useState<File | null>(null)
  const [flightPhotoFile, setFlightPhotoFile] = useState<File | null>(null)
  const [additionalFiles2, setAdditionalFiles2] = useState<File[]>([])

  const [items, setItems] = useState<string[]>(["Visa"])

  useEffect(() => {
    setManagers(getList("managers"))
    setCostCenters(getList("cost_centers"))
  }, [])

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(TravelFormSchema),
    defaultValues: {
      travelType: "visa_application",
      items: ["Visa"],
      ccEmails: [],
    },
  })

  const handleCancel = onCancel ?? (() => router.push("/travel"))

  const onSubmit = async (data: FormData) => {
    // Add the auto-CC email (Ap@si-ware.com)
    const finalCcEmails = addAutoCc(data.ccEmails || [])

    let redirectTo: string | null = null
    try {
      let payload: any = {
        ...data,
        ccEmails: finalCcEmails,
      }

      if (data.travelType === "visa_application") {
        // Convert visa application files to attachments
        if (!amanStickerFile || !passportFile) {
          console.error("Missing required visa attachments")
          return
        }
        const visaAttachments = await filesToAttachments([amanStickerFile, passportFile], "travel")
        const additionalAttachments = additionalFiles.length > 0 ? await filesToAttachments(additionalFiles, "travel") : []

        payload.amanSticker = visaAttachments[0]
        payload.passport = visaAttachments[1]
        payload.additionalAttachments = additionalAttachments
      } else {
        // Convert hotel & flight files to attachments
        if (!formFile || !passportFile2) {
          console.error("Missing required hotel & flight attachments")
          return
        }
        const requiredAttachments = await filesToAttachments([formFile, passportFile2], "travel")
        const additionalAttachments = additionalFiles2.length > 0 ? await filesToAttachments(additionalFiles2, "travel") : []

        payload.travelRequestForm = requiredAttachments[0]
        payload.passport = requiredAttachments[1]
        payload.additionalAttachments = additionalAttachments

        // Handle optional flight photo
        if (flightPhotoFile) {
          const flightAttachments = await filesToAttachments([flightPhotoFile], "travel")
          payload.flightPhoto = flightAttachments[0]
        }
      }

      const newReq = await submitRequest("travel", payload, {
        title: data.requestTitle,
        requesterId: session?.user?.id || "USR-001",
        requesterName: session?.user?.name || session?.user?.email || "Current User",
        requesterEmail: session?.user?.email || "user@si-ware.com",
      })

      createNewRequestNotifications({
        requestId: newReq.id,
        requestTitle: newReq.title,
        module: "travel",
        requesterId: newReq.requesterId,
        requesterName: newReq.requesterName,
        requesterEmail: newReq.requesterEmail,
        ccEmails: finalCcEmails,
      })

      redirectTo = "/travel"
    } catch (error) {
      console.error("Failed to create travel request:", error)
    }
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    }
  }

  const isVisaApplication = travelType === "visa_application"
  const hasHotel = items.includes("Hotel")
  const hasFlight = items.includes("Flight")

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Request Title */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1.5">
              <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
              <Input
                id="requestTitle"
                placeholder="e.g. Visa Application for Business Trip"
                {...register("requestTitle")}
                className={cn(errors.requestTitle && "border-red-400")}
              />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Request Type Selection */}
        <Card>
          <SectionHeader icon={Plane} title="Request Type" subtitle="Select the type of travel request" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {["visa_application", "hotel_flight_reservation"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTravelType(type as "visa_application" | "hotel_flight_reservation")
                    reset({
                      travelType: type as "visa_application" | "hotel_flight_reservation",
                      items: type === "visa_application" ? ["Visa"] : ["Visa"],
                      ccEmails: [],
                    })
                    if (type === "visa_application") {
                      setItems(["Visa"])
                    } else {
                      setItems(["Visa"])
                    }
                  }}
                  className={cn(
                    "p-4 rounded-lg border-2 transition-all text-left",
                    travelType === type
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <div className="font-medium text-sm text-gray-900">
                    {type === "visa_application" ? "Applying For Visa" : "Hotel & Flight Reservation"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {type === "visa_application"
                      ? "Visa document, Aman sticker, and passport"
                      : "Travel form, optional hotel & flight details"}
                  </p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <SectionHeader icon={FileText} title="Business Information" subtitle="Manager and cost center details" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Direct Manager <span className="text-red-500">*</span></Label>
                <Controller
                  name="directManager"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={managers}
                      placeholder="Select manager"
                      hasError={!!errors.directManager}
                    />
                  )}
                />
                <FieldError message={errors.directManager?.message} />
              </div>

              <div className="space-y-1.5">
                <Label>Cost Center <span className="text-red-500">*</span></Label>
                <Controller
                  name="costCenter"
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      options={costCenters}
                      placeholder="Select cost center"
                      hasError={!!errors.costCenter}
                    />
                  )}
                />
                <FieldError message={errors.costCenter?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <SectionHeader icon={Plane} title="Description" subtitle="Travel purpose and details" />
          <CardContent>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <MarkdownEditor
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  placeholder="Enter travel details, itinerary, or business purpose..."
                  error={errors.description?.message}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Items Selection - Only Hotel & Flight, no Visa */}
        {!isVisaApplication && (
          <Card>
            <SectionHeader icon={Plane} title="Travel Items" subtitle="Select what you need" />
            <CardContent className="space-y-3">
              {["Hotel", "Flight"].map((item) => (
                <label key={item} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={items.includes(item)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setItems([...items, item])
                      } else {
                        setItems(items.filter((i) => i !== item))
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">{item}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Hotel URL (if Hotel selected) */}
        {!isVisaApplication && hasHotel && (
          <Card>
            <SectionHeader icon={Plane} title="Hotel Details" subtitle="Optional hotel booking URL" />
            <CardContent>
              <div className="space-y-1.5">
                <Label htmlFor="hotelUrl">Hotel Booking URL</Label>
                <Input
                  id="hotelUrl"
                  type="url"
                  placeholder="https://example.com/hotel-booking"
                  {...register("hotelUrl")}
                  className={cn(errors.hotelUrl && "border-red-400")}
                />
                <FieldError message={errors.hotelUrl?.message} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flight Info (if Flight selected) */}
        {!isVisaApplication && hasFlight && (
          <Card>
            <SectionHeader icon={Plane} title="Flight Details" subtitle="Flight company and booking info" />
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="flightCompany">Flight Company Name</Label>
                <Input
                  id="flightCompany"
                  placeholder="e.g. EgyptAir, Emirates"
                  {...register("flightCompany")}
                  className={cn(errors.flightCompany && "border-red-400")}
                />
                <FieldError message={errors.flightCompany?.message} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Flight Booking Screenshot / Confirmation</Label>
                <div className="text-xs text-gray-500 mb-2">
                  Upload a screenshot of your flight booking confirmation (optional if company name is provided)
                </div>
                <div className="relative">
                  <input
                    type="file"
                    className="hidden"
                    id="upload-flight-photo"
                    onChange={(e) => setFlightPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-flight-photo")?.click()}
                    className="w-full px-4 py-6 border-2 border-dashed rounded-lg hover:bg-opacity-40 transition-all flex flex-col items-center justify-center gap-1.5 group"
                    style={{
                      borderColor: BRAND,
                      backgroundColor: `${BRAND}08`,
                    }}
                  >
                    <Upload className="h-5 w-5 group-hover:scale-110 transition-transform" style={{ color: BRAND }} />
                    <span className="text-sm font-medium text-gray-700">
                      {flightPhotoFile ? flightPhotoFile.name : "Click to browse"}
                    </span>
                  </button>
                </div>
                {flightPhotoFile && (
                  <button
                    type="button"
                    onClick={() => setFlightPhotoFile(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remove file
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Required Attachments" subtitle="Upload documents" />
          <CardContent className="space-y-6">
            {isVisaApplication ? (
              <>
                <AttachmentUploadZone
                  label="Aman Sticker"
                  required
                  value={amanStickerFile}
                  onChange={setAmanStickerFile}
                />
                <AttachmentUploadZone
                  label="Passport"
                  required
                  value={passportFile}
                  onChange={setPassportFile}
                />

                {/* Additional Attachments for Visa */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Additional Attachments (Optional)</Label>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="upload-additional-visa"
                    onChange={(e) => {
                      if (e.target.files) {
                        setAdditionalFiles(Array.from(e.target.files))
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-additional-visa")?.click()}
                    className="w-full px-4 py-6 border-2 border-dashed rounded-lg hover:bg-opacity-40 transition-all flex flex-col items-center justify-center gap-1.5 group"
                    style={{
                      borderColor: BRAND,
                      backgroundColor: `${BRAND}08`,
                    }}
                  >
                    <Upload className="h-5 w-5 group-hover:scale-110 transition-transform" style={{ color: BRAND }} />
                    <span className="text-sm font-medium text-gray-700">
                      {additionalFiles.length > 0 ? `${additionalFiles.length} file(s)` : "Click to browse"}
                    </span>
                  </button>
                  {additionalFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {additionalFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setAdditionalFiles(additionalFiles.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-teal-200 rounded transition-colors"
                          >
                            <X className="h-4 w-4 text-teal-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <AttachmentUploadZone
                  label="Travel Request Form"
                  required
                  value={formFile}
                  onChange={setFormFile}
                />
                <AttachmentUploadZone
                  label="Passport"
                  required
                  value={passportFile2}
                  onChange={setPassportFile2}
                />

                {/* Additional Attachments for Hotel & Flight */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Additional Attachments (Optional)</Label>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    id="upload-additional-hotel"
                    onChange={(e) => {
                      if (e.target.files) {
                        setAdditionalFiles2(Array.from(e.target.files))
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("upload-additional-hotel")?.click()}
                    className="w-full px-4 py-6 border-2 border-dashed rounded-lg hover:bg-opacity-40 transition-all flex flex-col items-center justify-center gap-1.5 group"
                    style={{
                      borderColor: BRAND,
                      backgroundColor: `${BRAND}08`,
                    }}
                  >
                    <Upload className="h-5 w-5 group-hover:scale-110 transition-transform" style={{ color: BRAND }} />
                    <span className="text-sm font-medium text-gray-700">
                      {additionalFiles2.length > 0 ? `${additionalFiles2.length} file(s)` : "Click to browse"}
                    </span>
                  </button>
                  {additionalFiles2.length > 0 && (
                    <div className="space-y-1.5">
                      {additionalFiles2.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setAdditionalFiles2(additionalFiles2.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-teal-200 rounded transition-colors"
                          >
                            <X className="h-4 w-4 text-teal-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <SectionHeader icon={Plane} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea
              placeholder="Optional notes about your travel request..."
              rows={3}
              {...register("notes")}
              className={cn(errors.notes && "border-red-400")}
            />
            <FieldError message={errors.notes?.message} />
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={Plane} title="CC Notifications" subtitle="Additional recipients for email updates" />
          <CardContent>
            <Controller
              control={control}
              name="ccEmails"
              render={({ field }) => <CcEmailsField value={field.value ?? []} onChange={field.onChange} />}
            />
          </CardContent>
        </Card>

        <div className="form-footer border-t bg-gray-50 py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            style={{ backgroundColor: BRAND }}
            className="text-white hover:opacity-90 min-w-[160px]"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default TravelForm
