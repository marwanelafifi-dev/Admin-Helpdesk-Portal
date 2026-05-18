"use client"

import { z } from "zod"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  FLOOR_NUMBERS,
  MaintenancePayloadSchema,
} from "./maintenance.schema"
import { createRequest } from "@/lib/requests-api"
import { useSession } from "next-auth/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Wrench, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

type MaintenanceForm = z.infer<typeof MaintenancePayloadSchema>

const fieldClass =
  "h-11 border-slate-300 bg-white text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
const textareaClass =
  "min-h-28 border-slate-300 bg-white text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-blue-500 focus-visible:ring-offset-0"
const labelClass = "text-sm font-medium text-slate-700"
const selectClass =
  "h-11 rounded-lg border-slate-300 bg-white text-slate-950 shadow-none focus:ring-blue-500 focus:ring-offset-0"

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
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  )
}

export function MaintenanceForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [apiError, setApiError] = useState<string | null>(null)
  const { register, control, handleSubmit, formState: { errors, isSubmitting } } = useForm<MaintenanceForm>({
    resolver: zodResolver(MaintenancePayloadSchema),
    defaultValues: { attachments: [] },
  })

  const handleCancel = onCancel ?? (() => router.push("/maintenance"))

  const onSubmit = async (data: MaintenanceForm) => {
    setApiError(null)
    const result = await createRequest(
      "maintenance",
      data as unknown as Record<string, unknown>,
      {
        title: `Maintenance – ${data.issueTitle}`,
        requesterId: session?.user?.id ?? "USR-CURRENT",
        requesterName: session?.user?.name ?? "Current User",
        requesterEmail: session?.user?.email ?? "",
      }
    )
    if (!result.ok) {
      setApiError(result.error)
      return
    }
    router.push("/maintenance")
    router.refresh()
  }

  return (
    <div className="request-form">
      <form onSubmit={handleSubmit(onSubmit)} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {apiError && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm font-medium text-red-700">{apiError}</div>
        )}

        <section className="border-b border-slate-200 p-6">
          <SectionHeader icon={Wrench} title="Issue Details" subtitle="Describe the maintenance issue" />
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="issueTitle" className={labelClass}>Issue Title <span className="text-red-500">*</span></Label>
              <Input id="issueTitle" placeholder="e.g. AC unit not cooling" {...register("issueTitle")} className={cn(fieldClass, errors.issueTitle && "border-red-400")} />
              <FieldError message={errors.issueTitle?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className={labelClass}>Description <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="Provide detailed description of the issue..." rows={4} {...register("description")} className={cn(textareaClass, errors.description && "border-red-400")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority" className={labelClass}>Priority <span className="text-red-500">*</span></Label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(selectClass, errors.priority && "border-red-400")}>
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
                <Label htmlFor="category" className={labelClass}>Category <span className="text-red-500">*</span></Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(selectClass, errors.category && "border-red-400")}>
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
                <Label htmlFor="floorNumber" className={labelClass}>Floor Number <span className="text-red-500">*</span></Label>
                <Controller
                  name="floorNumber"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(selectClass, errors.floorNumber && "border-red-400")}>
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
                <Label htmlFor="roomArea" className={labelClass}>Room/Area <span className="text-red-500">*</span></Label>
                <Input id="roomArea" placeholder="e.g. Conference Room A" {...register("roomArea")} className={cn(fieldClass, errors.roomArea && "border-red-400")} />
                <FieldError message={errors.roomArea?.message} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-50/70 p-6">
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload photos or documents" />
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
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/50"
            >
              <Upload className="h-6 w-6 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">Click to upload or drag and drop</span>
              <span className="text-xs text-slate-500">Photos or supporting documents</span>
            </button>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">{uploadedFiles.length} file(s) selected:</p>
                <div className="space-y-1.5">
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2.5">
                      <span className="truncate text-sm text-slate-700">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                        className="rounded p-1 text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">Optional: upload issue photos for faster resolution.</p>
          </div>
        </section>

        <section className="border-b border-slate-200 p-6">
          <SectionHeader icon={Wrench} title="Additional Notes" subtitle="Any extra information" />
          <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} className={textareaClass} />
        </section>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="ghost" onClick={handleCancel} className="text-slate-600 hover:bg-slate-100 hover:text-slate-950">Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="min-w-[210px] bg-blue-600 text-white hover:bg-blue-700">
            {isSubmitting ? "Submitting..." : "Submit Maintenance Request"}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default MaintenanceForm
