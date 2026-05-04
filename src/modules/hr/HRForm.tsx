"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ONBOARDING_ITEMS,
  OFFBOARDING_ITEMS,
  EMPLOYMENT_TYPES,
  ENTITIES,
  OnboardingPayloadSchema,
  OffboardingPayloadSchema,
} from "./hr.schema"
import { submitRequest, updateRequest, type EngineRequest } from "@/services/engineService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, UserPlus, UserMinus, User, Building2, Calendar, ClipboardList, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#0F766E" // teal-700

type HRType = "onboarding" | "offboarding"

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

// ─── Onboarding Form ──────────────────────────────────────────────────────────

type OnboardingForm = z.infer<typeof OnboardingPayloadSchema>
type OffboardingForm = z.infer<typeof OffboardingPayloadSchema>

function OnboardingFormFields({ onCancel, editingRequest, isEditing }: { onCancel: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<OnboardingForm>({
    resolver: zodResolver(OnboardingPayloadSchema),
    defaultValues: { hrType: "onboarding", items: [], attachments: [] },
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        hrType: "onboarding",
        requestTitle: editingRequest.title || "",
        employeeName: payload.employeeName || "",
        employeeId: payload.employeeId || "",
        mobileNumber: payload.mobileNumber || "",
        nationalIdNumber: payload.nationalIdNumber || "",
        jobTitle: payload.jobTitle || "",
        employmentType: payload.employmentType || "",
        sector: payload.sector || "",
        department: payload.department || "",
        directManager: payload.directManager || "",
        entity: payload.entity || "",
        startDate: payload.startDate || "",
        items: payload.items || [],
        notes: payload.notes || "",
      })
    }
  }, [editingRequest, isEditing, reset])

  const onSubmit = async (data: OnboardingForm) => {
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, data, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        submitRequest("hr", data, {
          title: data.requestTitle,
          requesterId: "USR-001",
          requesterName: "Current User",
          requesterEmail: "user@si-ware.com",
        })
      }
      router.push("/hr")
      router.refresh()
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("hrType")} value="onboarding" />

      {/* Request Title */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
            <Input id="requestTitle" placeholder="e.g. Onboarding for New Engineer" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
            <FieldError message={errors.requestTitle?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <SectionHeader icon={User} title="Employee Details" subtitle="Information about the new hire" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeName">Employee Name <span className="text-red-500">*</span></Label>
              <Input id="employeeName" placeholder="Full name" {...register("employeeName")} className={cn(errors.employeeName && "border-red-400")} />
              <FieldError message={errors.employeeName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
              <Input id="employeeId" placeholder="EMP-2026-XXX" {...register("employeeId")} className={cn(errors.employeeId && "border-red-400")} />
              <FieldError message={errors.employeeId?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mobileNumber">Mobile Number <span className="text-red-500">*</span></Label>
              <Input id="mobileNumber" placeholder="+1 (555) 000-0000" {...register("mobileNumber")} className={cn(errors.mobileNumber && "border-red-400")} />
              <FieldError message={errors.mobileNumber?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nationalIdNumber">National ID Number <span className="text-red-500">*</span></Label>
              <Input id="nationalIdNumber" placeholder="National ID" {...register("nationalIdNumber")} className={cn(errors.nationalIdNumber && "border-red-400")} />
              <FieldError message={errors.nationalIdNumber?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g. Senior Engineer" {...register("jobTitle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">Employment Type <span className="text-red-500">*</span></Label>
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.employmentType && "border-red-400")}>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.employmentType?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" placeholder="e.g. Technology" {...register("sector")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Input id="department" placeholder="e.g. Engineering" {...register("department")} className={cn(errors.department && "border-red-400")} />
              <FieldError message={errors.department?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="directManager">Direct Manager</Label>
            <Input id="directManager" placeholder="Manager name" {...register("directManager")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="entity">Entity <span className="text-red-500">*</span></Label>
            <Controller
              name="entity"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.entity && "border-red-400")}>
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITIES.map((entity) => (
                      <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={errors.entity?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startDate" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Start Date <span className="text-red-500">*</span>
            </Label>
            <Input id="startDate" type="date" {...register("startDate")} className={cn(errors.startDate && "border-red-400")} />
            <FieldError message={errors.startDate?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Onboarding Items */}
      <Card>
        <SectionHeader icon={ClipboardList} title="Onboarding Items" subtitle="Select all items required for this new hire" />
        <CardContent>
          <Controller
            name="items"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                {ONBOARDING_ITEMS.map((item) => (
                  <label key={item} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    field.value.includes(item)
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                    <input
                      type="checkbox"
                      checked={field.value.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, item])
                        } else {
                          field.onChange(field.value.filter((v) => v !== item))
                        }
                      }}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </label>
                ))}
                <FieldError message={errors.items?.message} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <SectionHeader icon={Upload} title="Attachments" subtitle="Upload supporting documents" />
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
              className="w-full px-6 py-8 border-2 border-dashed border-teal-300 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="h-6 w-6 text-teal-600 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
              <span className="text-xs text-muted-foreground">ID copies, contracts, or other documents</span>
            </button>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-teal-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-teal-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Optional: Upload supporting documents for faster processing</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader icon={Building2} title="Additional Notes" subtitle="Any extra information for this request" />
        <CardContent>
          <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Onboarding Request")}
        </Button>
      </div>
    </form>
  )
}

// ─── Offboarding Form ─────────────────────────────────────────────────────────

function OffboardingFormFields({ onCancel, editingRequest, isEditing }: { onCancel: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<OffboardingForm>({
    resolver: zodResolver(OffboardingPayloadSchema),
    defaultValues: { hrType: "offboarding", items: [], attachments: [] },
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        hrType: "offboarding",
        requestTitle: editingRequest.title || "",
        employeeName: payload.employeeName || "",
        employeeId: payload.employeeId || "",
        jobTitle: payload.jobTitle || "",
        employmentType: payload.employmentType || "",
        sector: payload.sector || "",
        department: payload.department || "",
        directManager: payload.directManager || "",
        lastWorkingDay: payload.lastWorkingDay || "",
        items: payload.items || [],
        notes: payload.notes || "",
      })
    }
  }, [editingRequest, isEditing, reset])

  const onSubmit = async (data: OffboardingForm) => {
    try {
      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, data, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        submitRequest("hr", data, {
          title: data.requestTitle,
          requesterId: "USR-001",
          requesterName: "Current User",
          requesterEmail: "user@si-ware.com",
        })
      }
      router.push("/hr")
      router.refresh()
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input type="hidden" {...register("hrType")} value="offboarding" />

      {/* Request Title */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="requestTitle">Request Title <span className="text-red-500">*</span></Label>
            <Input id="requestTitle" placeholder="e.g. Offboarding for Engineer" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
            <FieldError message={errors.requestTitle?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Employee Details */}
      <Card>
        <SectionHeader icon={User} title="Employee Details" subtitle="Information about the leaver" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="employeeName">Employee Name <span className="text-red-500">*</span></Label>
              <Input id="employeeName" placeholder="Full name" {...register("employeeName")} className={cn(errors.employeeName && "border-red-400")} />
              <FieldError message={errors.employeeName?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employeeId">Employee ID <span className="text-red-500">*</span></Label>
              <Input id="employeeId" placeholder="EMP-XXXX-XXX" {...register("employeeId")} className={cn(errors.employeeId && "border-red-400")} />
              <FieldError message={errors.employeeId?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input id="jobTitle" placeholder="e.g. Senior Manager" {...register("jobTitle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="employmentType">Employment Type <span className="text-red-500">*</span></Label>
              <Controller
                name="employmentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.employmentType && "border-red-400")}>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.employmentType?.message} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sector">Sector <span className="text-red-500">*</span></Label>
              <Input id="sector" placeholder="e.g. Engineering" {...register("sector")} className={cn(errors.sector && "border-red-400")} />
              <FieldError message={errors.sector?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Input id="department" placeholder="e.g. Marketing" {...register("department")} className={cn(errors.department && "border-red-400")} />
              <FieldError message={errors.department?.message} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="directManager">Direct Manager</Label>
            <Input id="directManager" placeholder="Manager name" {...register("directManager")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lastWorkingDay" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Last Working Day <span className="text-red-500">*</span>
            </Label>
            <Input id="lastWorkingDay" type="date" {...register("lastWorkingDay")} className={cn(errors.lastWorkingDay && "border-red-400")} />
            <FieldError message={errors.lastWorkingDay?.message} />
          </div>
        </CardContent>
      </Card>

      {/* Offboarding Items */}
      <Card>
        <SectionHeader icon={ClipboardList} title="Offboarding Items" subtitle="Select all items to be completed for this leaver" />
        <CardContent>
          <Controller
            name="items"
            control={control}
            render={({ field }) => (
              <div className="space-y-3">
                {OFFBOARDING_ITEMS.map((item) => (
                  <label key={item} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition",
                    field.value.includes(item)
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  )}>
                    <input
                      type="checkbox"
                      checked={field.value.includes(item)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          field.onChange([...field.value, item])
                        } else {
                          field.onChange(field.value.filter((v) => v !== item))
                        }
                      }}
                      className="h-4 w-4 accent-red-600"
                    />
                    <span className="text-sm font-medium">{item}</span>
                  </label>
                ))}
                <FieldError message={errors.items?.message} />
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* Attachments */}
      <Card>
        <SectionHeader icon={Upload} title="Attachments" subtitle="Upload supporting documents" />
        <CardContent>
          <div className="space-y-3">
            <input
              id="offboarding-attachments"
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
              onClick={() => document.getElementById("offboarding-attachments")?.click()}
              className="w-full px-6 py-8 border-2 border-dashed border-red-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
            >
              <Upload className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform duration-200" />
              <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
              <span className="text-xs text-muted-foreground">Exit documents or other files</span>
            </button>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-red-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Optional: Upload supporting documents for faster processing</p>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <SectionHeader icon={Building2} title="Additional Notes" subtitle="Any extra information for this request" />
        <CardContent>
          <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
        </CardContent>
      </Card>

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-red-600 text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Offboarding Request")}
        </Button>
      </div>
    </form>
  )
}

// ─── Main HR Form ─────────────────────────────────────────────────────────────

export function HRForm({ defaultType = "onboarding", onCancel, editingRequest, isEditing }: { defaultType?: HRType; onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const [hrType, setHrType] = useState<HRType>(isEditing && editingRequest?.payload ? (editingRequest.payload as any).hrType || defaultType : defaultType)
  const handleCancel = onCancel ?? (() => router.push("/hr"))

  return (
    <div className="space-y-5 max-w-3xl mx-auto pb-12">
      {/* Type Toggle - Disabled when editing */}
      {!isEditing && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHrType("onboarding")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition",
              hrType === "onboarding"
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Onboarding
          </button>
          <button
            type="button"
            onClick={() => setHrType("offboarding")}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition",
              hrType === "offboarding"
                ? "border-red-600 bg-red-50 text-red-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            <UserMinus className="h-4 w-4" />
            Offboarding
          </button>
        </div>
      )}

      {hrType === "onboarding"
        ? <OnboardingFormFields onCancel={handleCancel} editingRequest={editingRequest} isEditing={isEditing} />
        : <OffboardingFormFields onCancel={handleCancel} editingRequest={editingRequest} isEditing={isEditing} />
      }
    </div>
  )
}

export default HRForm
