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
import { submitRequest, getRequests, updateStatus, type EngineRequest } from "@/services/engineService"
import { createRequestUpdateNotifications } from "@/lib/notificationStore"

const schema = z.object({
  title:       z.string().min(1, "Title is required"),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export default function NewGeneralRequestPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const requestId = searchParams.get("id")
  const [existingRequest, setExistingRequest] = useState<EngineRequest | null>(null)
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
        reset({
          title: req.title,
          description: String((req.payload as Record<string, unknown>).description ?? ""),
        })
      }
    }
  }, [requestId, reset])

  async function onSubmit(values: FormValues) {
    const userId   = session?.user?.id   || "USR-001"
    const userName = session?.user?.name  || "Unknown User"
    const userEmail = session?.user?.email || ""

    if (isEditing && existingRequest) {
      // Update via status (no direct payload edit in engine) — just navigate back
      router.push("/general")
      return
    }

    const saved = submitRequest(
      "general",
      { description: values.description ?? "" },
      { title: values.title, requesterId: userId, requesterName: userName, requesterEmail: userEmail }
    )

    createRequestUpdateNotifications({
      requestId: saved.id,
      requestTitle: saved.title,
      module: "general",
      requestOwnerId: userId,
      requestOwnerEmail: userEmail,
      actionUserId: userId,
      actionUserName: userName,
      actionUserEmail: userEmail,
      preview: "New general request submitted",
      updateType: "request_updated",
      ccEmails: [],
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

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Request Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                placeholder="Enter a clear, concise title"
                {...register("title")}
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide details about your request…"
                rows={6}
                {...register("description")}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
              <Button type="button" variant="outline" onClick={() => router.push("/general")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isSubmitting ? "Submitting…" : isEditing ? "Save Changes" : "Submit Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
