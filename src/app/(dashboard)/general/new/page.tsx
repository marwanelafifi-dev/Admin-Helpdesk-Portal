"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Inbox, Mail } from "lucide-react"
import { submitRequest, getRequests, type EngineRequest } from "@/services/engineService"
import { createRequestUpdateNotifications, createNewRequestNotifications } from "@/lib/notificationStore"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { cn } from "@/lib/utils"

const schema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional(),
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

export default function NewGeneralRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [ccEmails, setCcEmails] = useState<string[]>([])
  const isEditing = !!requestId

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (requestId) {
      const req = getRequests().find(r => r.id === requestId)
      if (req) {
        setExistingRequest(req)
        const payload = req.payload as Record<string, unknown>
        reset({
          title: req.title,
          description: String(payload.description ?? ""),
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
      router.push("/general")
      return
    }

    // Convert files to base64 for storage
    const attachments: { name: string; url: string; sizeBytes: number }[] = await Promise.all(
      uploadedFiles.map(
        (file) =>
          new Promise<{ name: string; url: string; sizeBytes: number }>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) =>
              resolve({ name: file.name, url: e.target?.result as string, sizeBytes: file.size })
            reader.readAsDataURL(file)
          })
      )
    )

    const saved = submitRequest(
      "general",
      { description: values.description ?? "", attachments, ccEmails },
      { title: values.title, requesterId: userId, requesterName: userName, requesterEmail: userEmail }
    )

    createNewRequestNotifications({
      requestId: saved.id,
      requestTitle: saved.title,
      module: "general",
      requesterId: userId,
      requesterName: userName,
      requesterEmail: userEmail,
      ccEmails,
    })

    router.push("/general")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditing ? "Edit General Request" : "New General Request"}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {isEditing ? "Update the request details" : "Submit a general request"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-3xl mx-auto">

        {/* Request Details */}
        <Card>
          <SectionHeader icon={Inbox} title="Request Details" subtitle="Provide a title and description for your request" />
          <CardContent className="pt-5 space-y-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide details about your request…"
                rows={6}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload any supporting documents or files" />
          <CardContent className="pt-5">
            <div className="space-y-3">
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
                type="button"
                onClick={() => document.getElementById("general-attachments")?.click()}
                className="w-full px-6 py-8 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="h-6 w-6 text-indigo-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Any supporting documents or files</span>
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-indigo-50 border border-indigo-200">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
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
            <CcEmailsField value={ccEmails} onChange={setCcEmails} />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="form-footer flex items-center justify-between gap-3 border-t bg-gray-50 px-6 py-4">
          <Button type="button" variant="outline" onClick={() => router.push("/general")}>
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
