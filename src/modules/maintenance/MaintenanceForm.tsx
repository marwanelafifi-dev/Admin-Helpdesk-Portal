"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  FLOOR_NUMBERS,
  MaintenancePayloadSchema,
} from "./maintenance.schema"
import { submitRequest, updateRequest, type EngineRequest } from "@/services/engineService"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Wrench, Upload, X } from "lucide-react"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { cn } from "@/lib/utils"

const BRAND = "#A78BFA" // purple-400

type MaintenanceForm = z.infer<typeof MaintenancePayloadSchema>

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

export function MaintenanceForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<MaintenanceForm>({
    resolver: zodResolver(MaintenancePayloadSchema),
    defaultValues: { attachments: [], ccEmails: [] },
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        issueTitle: payload.issueTitle || "",
        description: payload.description || "",
        priority: payload.priority || "",
        category: payload.category || "",
        floorNumber: payload.floorNumber || "",
        roomArea: payload.roomArea || "",
        notes: payload.notes || "",
        attachments: payload.attachments || [],
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/maintenance"))

  const onSubmit = async (data: MaintenanceForm) => {
    try {
      if (isEditing && editingRequest) {
        // Update existing request
        updateRequest(editingRequest.id, data, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        // Create new request
        submitRequest("maintenance", data, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })
      }
      router.push("/maintenance")
      router.refresh()
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
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
              <Input id="requestTitle" placeholder="e.g. AC Repair - Floor 3" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Issue Details */}
        <Card>
          <SectionHeader icon={Wrench} title="Issue Details" subtitle="Describe the maintenance issue" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="issueTitle">Issue Title <span className="text-red-500">*</span></Label>
              <Input id="issueTitle" placeholder="e.g. AC unit not cooling" {...register("issueTitle")} className={cn(errors.issueTitle && "border-red-400")} />
              <FieldError message={errors.issueTitle?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="Provide detailed description of the issue..." rows={4} {...register("description")} className={cn(errors.description && "border-red-400")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.priority && "border-red-400")}>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINTENANCE_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.priority?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.category && "border-red-400")}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {MAINTENANCE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.category?.message} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="floorNumber">Floor Number <span className="text-red-500">*</span></Label>
                <Controller
                  name="floorNumber"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.floorNumber && "border-red-400")}>
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        {FLOOR_NUMBERS.map((floor) => (
                          <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.floorNumber?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roomArea">Room/Area <span className="text-red-500">*</span></Label>
                <Input id="roomArea" placeholder="e.g. Conference Room A" {...register("roomArea")} className={cn(errors.roomArea && "border-red-400")} />
                <FieldError message={errors.roomArea?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload photos or documents" />
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
                className="w-full px-6 py-8 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="h-6 w-6 text-purple-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Photos or supporting documents</span>
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-purple-200 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-purple-600" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Optional: Upload issue photos for faster resolution</p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <SectionHeader icon={Wrench} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={Wrench} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
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

        <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Maintenance Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default MaintenanceForm
