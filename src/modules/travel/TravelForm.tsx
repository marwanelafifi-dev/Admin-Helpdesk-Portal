"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { TravelFormSchema, type TravelForm as TravelFormType, CURRENCIES, PAYMENT_METHODS } from "./travel.schema"
import { submitRequest, updateRequest, pushToServer } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { filesToAttachments } from "@/lib/attachments"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Plane, DollarSign, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { MarkdownEditor } from "@/components/ui/MarkdownEditor"
import { getList, getAuthorizedManagers } from "@/lib/companyDataStore"

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
    <CardHeader className="pb-4 border-b">
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
  const [authorizedManagers, setAuthorizedManagers] = useState<Array<{ name: string; email: string }>>([])
  const [divisions, setDivisions] = useState<string[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  const [travelType, setTravelType] = useState<"visa_application" | "hotel_flight_reservation">("visa_application")
  const [attachmentError, setAttachmentError] = useState<string>("")

  // File states
  const [amanStickerFile, setAmanStickerFile] = useState<File | null>(null)
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(TravelFormSchema),
    defaultValues: {
      travelType: "visa_application",
      requestTitle: "",
      authorizedManager: "",
      costCenter: "",
      division: "",
      purposeOfTrip: "",
      destination: "",
      dateFrom: "",
      dateTo: "",
      tripAllowance: 0,
      airTicket: 0,
      hotel: 0,
      transportationCarRental: 0,
      others: "",
      othersAmount: 0,
      currency: "EGP",
      estimatedTotalCosts: 0,
      paymentMethod: "cash",
      paymentAmount: 0,
      paymentCurrency: "EGP",
      ccEmails: [],
      notes: "",
    },
  })

  // Load company data (client-only to avoid hydration mismatch)
  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuthorizedManagers(getAuthorizedManagers())
      setDivisions(getList("sectors")) // Divisions use sectors from company data
      setCostCenters(getList("cost_centers"))
    }
  }, [])

  // Watch cost fields and auto-calculate total
  const tripAllowance = watch("tripAllowance") || 0
  const airTicket = watch("airTicket") || 0
  const hotel = watch("hotel") || 0
  const transportationCarRental = watch("transportationCarRental") || 0
  const othersAmount = watch("othersAmount") || 0
  const estimatedTotal = watch("estimatedTotalCosts") || 0
  const paymentCurrency = watch("paymentCurrency")

  useEffect(() => {
    const total = tripAllowance + airTicket + hotel + transportationCarRental + othersAmount
    setValue("estimatedTotalCosts", total)
    // Auto-sync payment amount with total
    setValue("paymentAmount", total)
  }, [tripAllowance, airTicket, hotel, transportationCarRental, othersAmount, setValue])

  const onSubmit = async (data: FormData) => {
    setAttachmentError("")

    // Validate required attachments
    if (!amanStickerFile) {
      setAttachmentError("Aman Sticker is required")
      return
    }
    if (!passportFile) {
      setAttachmentError("Passport is required")
      return
    }

    try {
      const attachments = await filesToAttachments([amanStickerFile, passportFile, ...additionalFiles])

      const payload = {
        ...data,
        amanSticker: attachments[0],
        passport: attachments[1],
        additionalAttachments: attachments.slice(2),
      }

      const request = await submitRequest({
        module: "travel",
        status: "new",
        title: data.requestTitle,
        description: data.description || "",
        payload,
        requesterEmail: session?.user?.email || "",
        requesterName: session?.user?.name || "",
      })

      void pushToServer()
      void createNewRequestNotifications(request)

      router.push("/travel")
    } catch (err) {
      setAttachmentError("Failed to submit request. Please try again.")
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-6 pb-6">
      {/* Travel Type Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Travel Request Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setTravelType("visa_application")
                setValue("travelType", "visa_application")
              }}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all",
                travelType === "visa_application"
                  ? "border-teal-500 bg-teal-50 text-teal-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              Visa Application
            </button>
            <button
              type="button"
              onClick={() => {
                setTravelType("hotel_flight_reservation")
                setValue("travelType", "hotel_flight_reservation")
              }}
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all",
                travelType === "hotel_flight_reservation"
                  ? "border-teal-500 bg-teal-50 text-teal-900"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              Hotel & Flight Reservation
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <SectionHeader icon={Plane} title="Basic Information" />
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-sm font-medium">Request Title *</Label>
            <Controller
              name="requestTitle"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="e.g., Conference in Cairo"
                  className="mt-2"
                />
              )}
            />
            <FieldError message={errors.requestTitle?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Authorized Manager *</Label>
              <Controller
                name="authorizedManager"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={(authorizedManagers || []).map((m) => m.name)}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Authorized Manager"
                  />
                )}
              />
              <FieldError message={errors.authorizedManager?.message} />
            </div>

            <div>
              <Label className="text-sm font-medium">Cost Center *</Label>
              <Controller
                name="costCenter"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={costCenters || []}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select Cost Center"
                  />
                )}
              />
              <FieldError message={errors.costCenter?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card>
        <SectionHeader icon={Plane} title="Trip Details" />
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-sm font-medium">Division *</Label>
            <Controller
              name="division"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={divisions || []}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select Division"
                />
              )}
            />
            <FieldError message={errors.division?.message} />
          </div>

          <div>
            <Label className="text-sm font-medium">Purpose of Trip *</Label>
            <Controller
              name="purposeOfTrip"
              control={control}
              render={({ field }) => (
                <MarkdownEditor
                  {...field}
                  placeholder="Describe the purpose of this trip"
                  maxLength={500}
                />
              )}
            />
            <FieldError message={errors.purposeOfTrip?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Destination *</Label>
              <Controller
                name="destination"
                control={control}
                render={({ field }) => (
                  <Input {...field} placeholder="e.g., Cairo, Egypt" className="mt-2" />
                )}
              />
              <FieldError message={errors.destination?.message} />
            </div>

            <div>
              <Label className="text-sm font-medium">Date From *</Label>
              <Controller
                name="dateFrom"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="date" className="mt-2" />
                )}
              />
              <FieldError message={errors.dateFrom?.message} />
            </div>

            <div>
              <Label className="text-sm font-medium">Date To *</Label>
              <Controller
                name="dateTo"
                control={control}
                render={({ field }) => (
                  <Input {...field} type="date" className="mt-2" />
                )}
              />
              <FieldError message={errors.dateTo?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trip Costs */}
      <Card>
        <SectionHeader icon={DollarSign} title="Trip Costs" subtitle="All amounts in selected currency" />
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Trip Allowance *</Label>
              <Controller
                name="tripAllowance"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Air Ticket *</Label>
              <Controller
                name="airTicket"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Hotel *</Label>
              <Controller
                name="hotel"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Transportation / Car Rental *</Label>
              <Controller
                name="transportationCarRental"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Others (Specify)</Label>
              <Controller
                name="others"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    placeholder="e.g., Visa processing fee"
                    className="mt-2"
                  />
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Others Amount</Label>
              <Controller
                name="othersAmount"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min="0"
                    step="0.01"
                    className="mt-2"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium">Currency *</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border rounded-lg mt-2 text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium font-semibold">Estimated Total Costs</Label>
              <div className="mt-2 px-3 py-2 border rounded-lg bg-blue-50 text-blue-900 font-semibold">
                {watch("estimatedTotalCosts").toFixed(2)} {watch("currency")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <SectionHeader icon={DollarSign} title="Payment Method" subtitle="How will you receive the total trip amount?" />
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label className="text-sm font-medium">Payment Method *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <>
                    <button
                      type="button"
                      onClick={() => field.onChange("cash")}
                      className={cn(
                        "px-4 py-3 rounded-lg border-2 font-medium transition-all text-left",
                        field.value === "cash"
                          ? "border-teal-500 bg-teal-50 text-teal-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      )}
                    >
                      💵 Cash
                      <p className="text-xs text-muted-foreground mt-1">Receive in cash</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => field.onChange("company_credit_card")}
                      className={cn(
                        "px-4 py-3 rounded-lg border-2 font-medium transition-all text-left",
                        field.value === "company_credit_card"
                          ? "border-teal-500 bg-teal-50 text-teal-900"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                      )}
                    >
                      💳 Company Credit Card
                      <p className="text-xs text-muted-foreground mt-1">Charged to company card</p>
                    </button>
                  </>
                )}
              />
            </div>
            <FieldError message={errors.paymentMethod?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <Label className="text-sm font-medium">Payment Amount *</Label>
              <Controller
                name="paymentAmount"
                control={control}
                render={({ field }) => (
                  <div className="mt-2 px-3 py-2 border rounded-lg bg-gray-50">
                    <p className="text-lg font-semibold text-gray-900">
                      {field.value.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Auto-synced from total costs</p>
                  </div>
                )}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Currency *</Label>
              <Controller
                name="paymentCurrency"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border rounded-lg mt-2 text-sm"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
              />
              <FieldError message={errors.paymentCurrency?.message} />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-xs">
            ℹ️ The payment amount is automatically set to match your estimated total costs. Select your preferred payment method above.
          </div>
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base">Required Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {attachmentError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {attachmentError}
            </div>
          )}

          <AttachmentUploadZone
            label="Aman Sticker"
            required
            value={amanStickerFile || undefined}
            onChange={setAmanStickerFile}
          />
          <AttachmentUploadZone
            label="Passport"
            required
            value={passportFile || undefined}
            onChange={setPassportFile}
          />

          <div>
            <Label className="text-sm font-medium">Additional Attachments (Optional)</Label>
            <div className="mt-2 space-y-2">
              <input
                type="file"
                className="hidden"
                id="additional-files"
                multiple
                onChange={(e) => setAdditionalFiles(Array.from(e.target.files || []))}
              />
              <button
                type="button"
                onClick={() => document.getElementById("additional-files")?.click()}
                className="w-full px-4 py-3 border-2 border-dashed rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium text-gray-700"
              >
                <Upload className="h-4 w-4" />
                Click to add files
              </button>
              {additionalFiles.length > 0 && (
                <div className="space-y-2">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <span className="text-sm flex-1 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAdditionalFiles(additionalFiles.filter((_, i) => i !== idx))
                        }
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description & CC */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-base">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label className="text-sm font-medium">Description</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <MarkdownEditor {...field} placeholder="Add any additional details" maxLength={1000} />
              )}
            />
          </div>

          <div>
            <Label className="text-sm font-medium">Notes</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea {...field} placeholder="Internal notes..." className="mt-2" />
              )}
            />
          </div>

          <Controller
            name="ccEmails"
            control={control}
            render={({ field }) => (
              <CcEmailsField value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3 justify-end form-footer">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/travel")}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: BRAND }}
          className="text-white"
        >
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  )
}
