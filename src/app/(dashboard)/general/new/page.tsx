"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownEditor } from "@/components/ui/MarkdownEditor"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Inbox, Mail, FileText } from "lucide-react"
import { submitRequest, getRequests, updateRequest, pushToServer, type EngineRequest } from "@/services/engineService"
import { createRequestUpdateNotifications, createNewRequestNotifications } from "@/lib/notificationStore"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { filesToAttachments } from "@/lib/attachments"
import { cn } from "@/lib/utils"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getList, getManagerEmail } from "@/lib/companyDataStore"

const HR_LETTER_TYPES = ["Bank Account Letter", "Travel HR Letter - Personal", "Others"] as const
const HR_LETTER_DATA = ["Name", "Title", "Start Date", "National ID", "Passport No", "Salary"] as const

function requiresLetterDetails(type?: string) {
  return type === "Others" || type === "Travel HR Letter - Personal"
}

const schema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional(),
  hrLetterType: z.enum(HR_LETTER_TYPES).optional(),
  directManager: z.string().optional(),
  toEntity: z.string().optional(),
  embassy: z.string().optional(),
  travelDateFrom: z.string().optional(),
  travelDateTo: z.string().optional(),
  passportFile: z.custom<File>(value => typeof File !== "undefined" && value instanceof File, "Attach a passport file").optional(),
  language: z.enum(["Arabic", "English"]).optional(),
  letterData: z.array(z.enum(HR_LETTER_DATA)).optional(),
})

type FormValues = z.infer<typeof schema>

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b bg-gray-50 rounded-t-lg">
      <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
        <Icon className="h-4 w-4 text-indigo-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}

interface NewGeneralRequestPageProps {
  moduleId?: string
  basePath?: string
  departmentName?: string
  /** Human label used in page titles/headers (e.g. "HR Letter Request"). Defaults to "General Request". */
  requestLabel?: string
  /** Override the default "Submit a [request]" subtitle line entirely. */
  formSubtitle?: string
}

export default function NewGeneralRequestPage({
  moduleId = "general",
  basePath = "/general",
  departmentName,
  requestLabel = "General Request",
  formSubtitle,
}: NewGeneralRequestPageProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const [managers, setManagers] = useState<string[]>([])
  const isEditing = !!requestId
  const isHRLetter = moduleId === "hr_letter"
  const formSchema = schema.superRefine((values, ctx) => {
    if (!isHRLetter) return
    if (!values.directManager?.trim()) {
      ctx.addIssue({ code: "custom", path: ["directManager"], message: "Direct manager is required" })
    } else if (!z.email().safeParse(getManagerEmail(values.directManager)).success) {
      ctx.addIssue({ code: "custom", path: ["directManager"], message: "This manager needs a valid email configured in Company Data to receive CC notifications" })
    }
    if (!values.hrLetterType) {
      ctx.addIssue({ code: "custom", path: ["hrLetterType"], message: "Select an HR letter type" })
    }
    if (requiresLetterDetails(values.hrLetterType)) {
      if (!values.description?.trim()) {
        ctx.addIssue({ code: "custom", path: ["description"], message: "Purpose is required" })
      }
    }
    if (values.hrLetterType === "Travel HR Letter - Personal") {
      if (!values.passportFile || values.passportFile.size === 0) {
        ctx.addIssue({ code: "custom", path: ["passportFile"], message: "Attach your passport" })
      }
      if (!values.embassy?.trim()) {
        ctx.addIssue({ code: "custom", path: ["embassy"], message: "Enter the embassy the letter is addressed to" })
      }
      if (!values.travelDateFrom) {
        ctx.addIssue({ code: "custom", path: ["travelDateFrom"], message: "Select the travel start date" })
      }
      if (!values.travelDateTo) {
        ctx.addIssue({ code: "custom", path: ["travelDateTo"], message: "Select the travel end date" })
      }
      if (values.travelDateFrom && values.travelDateTo && values.travelDateTo < values.travelDateFrom) {
        ctx.addIssue({ code: "custom", path: ["travelDateTo"], message: "End date must be on or after the start date" })
      }
    }
    if (values.hrLetterType === "Others") {
      if (!values.toEntity?.trim()) {
        ctx.addIssue({ code: "custom", path: ["toEntity"], message: "Enter the entity the letter is addressed to" })
      }
      if (!values.language) {
        ctx.addIssue({ code: "custom", path: ["language"], message: "Select a language" })
      }
      if (!values.letterData?.length) {
        ctx.addIssue({ code: "custom", path: ["letterData"], message: "Select at least one item to include in the letter" })
      }
    }
  })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { letterData: [] } })
  const directManager = watch("directManager")
  const managerEmail = isHRLetter && directManager ? getManagerEmail(directManager) : undefined
  const requestCcEmails = Array.from(new Map(
    [...ccEmails, ...(managerEmail ? [managerEmail] : [])].map(email => [email.trim().toLowerCase(), email.trim()])
  ).values())
  const hrLetterType = watch("hrLetterType")
  const isPersonalTravel = isHRLetter && hrLetterType === "Travel HR Letter - Personal"
  const hasLetterDetails = isHRLetter && requiresLetterDetails(hrLetterType)

  useEffect(() => {
    if (isHRLetter) setManagers(getList("managers"))
  }, [isHRLetter])

  useEffect(() => {
    if (requestId) {
      const req = getRequests().find(r => r.id === requestId)
      if (req) {
        setExistingRequest(req)
        const payload = req.payload as Record<string, unknown>
        reset({
          title: req.title,
          description: String(payload.description ?? ""),
          hrLetterType: schema.shape.hrLetterType.safeParse(payload.hrLetterType).data,
          directManager: String(payload.directManager ?? ""),
          toEntity: String(payload.toEntity ?? ""),
          embassy: String(payload.embassy ?? ""),
          travelDateFrom: String(payload.travelDateFrom ?? ""),
          travelDateTo: String(payload.travelDateTo ?? ""),
          language: schema.shape.language.safeParse(payload.language).data,
          letterData: schema.shape.letterData.safeParse(payload.letterData).data ?? [],
        })
        if (Array.isArray(payload.ccEmails)) setCcEmails(payload.ccEmails as string[])
      }
    }
  }, [requestId, reset])

  async function onSubmit(values: FormValues) {
    const userId    = session?.user?.id    || "USR-001"
    const userName  = session?.user?.name  || "Unknown User"
    const userEmail = session?.user?.email || ""

    if (isEditing) {
      router.push(basePath)
      return
    }

    const payload = {
      description: values.description ?? "",
      ccEmails: requestCcEmails,
      ...(isHRLetter ? {
        hrLetterType: values.hrLetterType,
        directManager: values.directManager?.trim(),
        ...(values.hrLetterType === "Others" ? {
          toEntity: values.toEntity?.trim(),
          language: values.language,
          letterData: values.letterData,
        } : {}),
        ...(values.hrLetterType === "Travel HR Letter - Personal" ? {
          embassy: values.embassy?.trim(),
          travelDateFrom: values.travelDateFrom,
          travelDateTo: values.travelDateTo,
        } : {}),
      } : {}),
    }

    // 1. Submit request first (without attachments) to get server-assigned ID
    const saved = await submitRequest(
      moduleId,
      { ...payload, attachments: [] },
      { title: values.title, requesterId: userId, requesterName: userName, requesterEmail: userEmail }
    )

    // 2. Upload files if any
    let attachments = []
    const files = isPersonalTravel && values.passportFile ? [values.passportFile, ...uploadedFiles] : uploadedFiles
    if (files.length > 0) {
      attachments = await filesToAttachments(files, saved.id)
      // 3. Patch attachments back into the request
      if (attachments.length > 0) {
        const updated = updateRequest(saved.id, { ...payload, attachments }, { title: values.title })
        if (updated) {
          void pushToServer(updated)
        }
      }
    }

    createNewRequestNotifications({
      requestId: saved.id,
      requestTitle: saved.title,
      module: moduleId,
      requesterId: userId,
      requesterName: userName,
      requesterEmail: userEmail,
      ccEmails: requestCcEmails,
    })

    router.push(basePath)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? `Edit ${requestLabel}` : departmentName ? `${departmentName} ${requestLabel}` : `New ${requestLabel}`}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isEditing
            ? "Update the request details"
            : formSubtitle ?? (departmentName ? `Submit a request to the ${departmentName}` : "Submit a request")}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-3xl mx-auto">

        {/* Request Details */}
        <Card>
          <SectionHeader icon={Inbox} title="Request Details" subtitle={hasLetterDetails ? "Provide a title and purpose for your request" : "Provide a title and description for your request"} />
          <CardContent className="pt-5 space-y-4">
            {isHRLetter && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="hrLetterType">HR Letter Type <span className="text-red-500">*</span></Label>
                  <select id="hrLetterType" {...register("hrLetterType", { setValueAs: value => value || undefined })} aria-invalid={!!errors.hrLetterType}
                    className={cn("flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm", errors.hrLetterType && "border-red-500")}>
                    <option value="">Select HR letter type</option>
                    {HR_LETTER_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                  {errors.hrLetterType && <p className="text-sm text-red-500">{errors.hrLetterType.message}</p>}
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="title">Request Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Enter a clear, concise title"
                {...register("title")}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>
            {isHRLetter && (
              <div className="space-y-1.5">
                <Label>Direct Manager <span className="text-red-500">*</span></Label>
                <Controller name="directManager" control={control} render={({ field }) => (
                  <SearchableSelect value={field.value ?? ""} onChange={field.onChange}
                    options={managers} placeholder="Select direct manager" hasError={!!errors.directManager} />
                )} />
                {errors.directManager && <p className="text-sm text-red-500" role="alert">{errors.directManager.message}</p>}
              </div>
            )}
            {isHRLetter && (
              <>
                {hrLetterType === "Others" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="toEntity">TO (the entity) <span className="text-red-500">*</span></Label>
                      <Input id="toEntity" placeholder="Enter the entity the letter is addressed to" {...register("toEntity")}
                        aria-invalid={!!errors.toEntity} className={errors.toEntity ? "border-red-500" : ""} />
                      {errors.toEntity && <p className="text-sm text-red-500">{errors.toEntity.message}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="language">Language <span className="text-red-500">*</span></Label>
                      <select id="language" {...register("language", { setValueAs: value => value || undefined })} aria-invalid={!!errors.language}
                        className={cn("flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm", errors.language && "border-red-500")}>
                        <option value="">Select language</option>
                        <option value="Arabic">Arabic</option>
                        <option value="English">English</option>
                      </select>
                      {errors.language && <p className="text-sm text-red-500">{errors.language.message}</p>}
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-sm font-medium">Data to include in the HR Letter <span className="text-red-500">*</span></legend>
                      <p className="text-xs text-muted-foreground">Select all that apply.</p>
                      <Controller name="letterData" control={control} render={({ field }) => (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {HR_LETTER_DATA.map(item => (
                            <label key={item} className="flex items-center gap-2 text-sm">
                              <input type="checkbox" value={item} checked={(field.value ?? []).includes(item)}
                                onBlur={field.onBlur} onChange={event => field.onChange(event.target.checked
                                  ? [...(field.value ?? []), item]
                                  : (field.value ?? []).filter(value => value !== item))}
                                className="h-4 w-4 accent-blue-600" />
                              {item}
                            </label>
                          ))}
                        </div>
                      )} />
                      {errors.letterData && <p className="text-sm text-red-500">{errors.letterData.message}</p>}
                    </fieldset>
                  </>
                )}
              </>
            )}


            {isPersonalTravel && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="embassy">TO (Embassy) <span className="text-red-500">*</span></Label>
                  <Input id="embassy" placeholder="Enter the embassy" {...register("embassy")}
                    aria-invalid={!!errors.embassy} className={errors.embassy ? "border-red-500" : ""} />
                  {errors.embassy && <p className="text-sm text-red-500">{errors.embassy.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="travelDateFrom">Travel Dates From <span className="text-red-500">*</span></Label>
                    <Input id="travelDateFrom" type="date" {...register("travelDateFrom")} aria-invalid={!!errors.travelDateFrom} />
                    {errors.travelDateFrom && <p className="text-sm text-red-500">{errors.travelDateFrom.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="travelDateTo">Travel Dates To <span className="text-red-500">*</span></Label>
                    <Input id="travelDateTo" type="date" min={watch("travelDateFrom") || undefined} {...register("travelDateTo")} aria-invalid={!!errors.travelDateTo} />
                    {errors.travelDateTo && <p className="text-sm text-red-500">{errors.travelDateTo.message}</p>}
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="description">{hasLetterDetails ? "Purpose" : "Description"}{hasLetterDetails && <span className="text-red-500"> *</span>}</Label>
              <Controller name="description" control={control} render={({ field }) => (
                <MarkdownEditor id="description" value={field.value ?? ""} onChange={field.onChange} placeholder="Provide details about your request…" rows={6} />
              )} />
              {errors.description && <p className="text-sm text-red-500" role="alert">{errors.description.message}</p>}
            </div>

          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload any supporting documents or files" />
          <CardContent className="pt-5 space-y-5">
            {isPersonalTravel && (
                <div className="space-y-1.5">
                  <Label htmlFor="passportFile">Attach Passport <span className="text-red-500">*</span></Label>
                  <Controller name="passportFile" control={control} render={({ field }) => (
                    <div className="space-y-3">
                      <input id="passportFileInput" type="file" name={field.name} className="hidden"
                        onChange={event => {
                          const file = event.target.files?.[0]
                          if (file) field.onChange(file)
                          event.target.value = ""
                        }} />
                      <button id="passportFile" type="button" ref={field.ref} onBlur={field.onBlur}
                        onClick={() => document.getElementById("passportFileInput")?.click()}
                        aria-invalid={!!errors.passportFile} aria-describedby={errors.passportFile ? "passportFileError" : undefined}
                        className={cn("w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
                          errors.passportFile ? "border-red-500 bg-red-50" : field.value ? "border-indigo-400 bg-indigo-50/60 hover:bg-indigo-50" : "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50")}>
                        {field.value ? <FileText className="h-5 w-5 text-indigo-600" /> : <Upload className="h-6 w-6 text-indigo-600" />}
                        <span className="text-sm font-medium text-gray-700">{field.value ? field.value.name : "Click to browse passport"}</span>
                        <span className="text-xs text-muted-foreground">{field.value ? "Click to replace passport" : "Upload your passport"}</span>
                      </button>
                      {field.value && (
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                          <span className="text-sm text-gray-700 truncate">{field.value.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{(field.value.size / 1024).toFixed(0)} KB</span>
                          <button type="button" aria-label="Remove passport" onClick={() => field.onChange(undefined)}
                            className="p-1 hover:bg-indigo-200 rounded transition-colors flex-shrink-0">
                            <X className="h-4 w-4 text-indigo-600" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Required: Attach your passport</p>
                    </div>
                  )} />
                  {errors.passportFile && <p id="passportFileError" className="text-sm text-red-500" role="alert">{errors.passportFile.message}</p>}
                </div>
            )}
            <div className="space-y-3">
              {isPersonalTravel && <Label htmlFor="additionalAttachments">Additional Attachment</Label>}
              <input
                id="general-attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setUploadedFiles(prev => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              <button
                id="additionalAttachments"
                type="button"
                onClick={() => document.getElementById("general-attachments")?.click()}
                className={`w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2 ${uploadedFiles.length > 0 ? "border-indigo-400 bg-indigo-50/60 hover:bg-indigo-50" : "border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50"}`}
              >
                {uploadedFiles.length > 0 ? (
                  <>
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">
                      {uploadedFiles.length === 1 ? uploadedFiles[0].name : `${uploadedFiles.length} files selected`}
                    </span>
                    <span className="text-xs text-indigo-500">Click to add more</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                    <span className="text-xs text-muted-foreground">Any supporting documents or files</span>
                  </>
                )}
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-indigo-200 rounded transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4 text-indigo-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">Optional: Upload any supporting documents</p>
            </div>
          </CardContent>
        </Card>

        {/* CC Notifications — last card before the submit footer */}
        <Card>
          <SectionHeader icon={Mail} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
          <CardContent className="pt-5">
            <CcEmailsField value={requestCcEmails} onChange={emails => setCcEmails(
              emails.filter(email => !managerEmail || email.toLowerCase() !== managerEmail.toLowerCase())
            )} />
            {isHRLetter && managerEmail && <p className="text-xs text-muted-foreground mt-2">Direct manager ({managerEmail}) is automatically included in CC.</p>}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="form-footer flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => router.push(basePath)}> 
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSubmitting ? "Submitting…" : isEditing ? "Save Changes" : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}
