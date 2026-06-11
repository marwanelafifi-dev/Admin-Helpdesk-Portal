"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  PURCHASE_CATEGORIES,
  PURCHASE_PLATFORMS,
  PurchasePayloadSchema,
} from "./purchase.schema"
import { submitRequest, updateRequest, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, ShoppingCart, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getList, getManagerEmail } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#22c55e" // green-500

type PurchaseForm = z.infer<typeof PurchasePayloadSchema>

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

export function PurchaseForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  const [managers, setManagers] = useState<string[]>([])
  useEffect(() => {
    setCostCenters(getList("cost_centers"))
    setManagers(getList("managers"))
  }, [])
  const { register, control, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm<PurchaseForm>({
    resolver: zodResolver(PurchasePayloadSchema),
    defaultValues: { attachments: [], ccEmails: [] },
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        itemTitle: payload.itemTitle || "",
        description: payload.description || "",
        category: payload.category || "Other",
        supplier: payload.supplier || "",
        platform: payload.platform || "Other",
        productUrl: payload.productUrl || "",
        quantity: payload.quantity || 1,
        estimatedPrice: payload.estimatedPrice || 0,
        costCenter: payload.costCenter || "",
        directManager: payload.directManager || "",
        notes: payload.notes || "",
        attachments: payload.attachments || [],
      })
    }
  }, [editingRequest, isEditing, reset])

  const platformValue = watch("platform")

  const handleCancel = onCancel ?? (() => router.push("/purchase"))

  const onSubmit = async (data: PurchaseForm) => {
    // Auto-CC the Direct Manager. Resolves the manager name to an email via
    // Company Data and appends it to ccEmails (case-insensitive dedupe).
    const managerEmail = data.directManager ? getManagerEmail(data.directManager) : undefined
    if (managerEmail) {
      const existing = data.ccEmails ?? []
      const lower = new Set(existing.map((e) => e.toLowerCase()))
      if (!lower.has(managerEmail.toLowerCase())) {
        data.ccEmails = [...existing, managerEmail]
      }
    }

    let redirectTo: string | null = null
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
        // Create new request — convert uploaded files to data URLs first.
        const attachments = await filesToAttachments(uploadedFiles, "purchase")
        const newReq = submitRequest("purchase", { ...data, attachments } as any, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })
        createNewRequestNotifications({
          requestId: newReq.id,
          requestTitle: newReq.title,
          module: "purchase",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: managerEmail,
        })
      }
      redirectTo = "/purchase"
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
    }
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
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
              <Input id="requestTitle" placeholder="e.g. Purchase Monitors for Engineering Team" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card>
          <SectionHeader icon={ShoppingCart} title="Item Details" subtitle="What would you like to purchase?" />
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="itemTitle">Item Title <span className="text-red-500">*</span></Label>
              <Input id="itemTitle" placeholder="e.g. Dell 27-inch Monitor" {...register("itemTitle")} className={cn(errors.itemTitle && "border-red-400")} />
              <FieldError message={errors.itemTitle?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="Describe the item, specifications, or requirements..." rows={4} {...register("description")} className={cn(errors.description && "border-red-400")} />
              <FieldError message={errors.description?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {PURCHASE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.category?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="platform">Platform <span className="text-red-500">*</span></Label>
                <Controller
                  name="platform"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.platform && "border-red-400")}>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PURCHASE_PLATFORMS.map((platform) => (
                          <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.platform?.message} />
              </div>
            </div>

            {platformValue === "Other" && (
              <div className="space-y-1.5">
                <Label htmlFor="supplier">Supplier <span className="text-red-500">*</span></Label>
                <Input id="supplier" placeholder="Enter supplier name" {...register("supplier")} className={cn(errors.supplier && "border-red-400")} />
                <FieldError message={errors.supplier?.message} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="productUrl">Product URL (Optional)</Label>
              <Input id="productUrl" type="url" placeholder="https://amazon.com/product or https://noon.com/product" {...register("productUrl")} className={cn(errors.productUrl && "border-red-400")} />
              <FieldError message={errors.productUrl?.message} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity <span className="text-red-500">*</span></Label>
                <Input id="quantity" type="number" min="1" placeholder="1" {...register("quantity", { valueAsNumber: true })} className={cn(errors.quantity && "border-red-400")} />
                <FieldError message={errors.quantity?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimatedPrice">Estimated Price (EGP) <span className="text-red-500">*</span></Label>
                <Input id="estimatedPrice" type="number" min="0" max="3000" step="0.01" placeholder="0.00" {...register("estimatedPrice", { valueAsNumber: true })} className={cn(errors.estimatedPrice && "border-red-400")} />
                <p className="text-xs text-muted-foreground">Maximum allowed: 3000 EGP</p>
                <FieldError message={errors.estimatedPrice?.message} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <SectionHeader icon={ShoppingCart} title="Business Information" subtitle="Cost center and justification" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="Select direct manager"
                      hasError={!!errors.directManager}
                    />
                  )}
                />
                <FieldError message={errors.directManager?.message} />
                <p className="text-xs text-muted-foreground">The selected manager is automatically CC&apos;d on this request.</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessJustification">Business Justification <span className="text-red-500">*</span></Label>
              <Textarea id="businessJustification" placeholder="Explain why this purchase is needed and its business value..." rows={4} {...register("businessJustification")} className={cn(errors.businessJustification && "border-red-400")} />
              <FieldError message={errors.businessJustification?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Attachments" subtitle="Upload quotes, specifications, or approvals" />
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
                className="w-full px-6 py-8 border-2 border-dashed border-green-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all duration-200 flex flex-col items-center justify-center gap-2 group"
              >
                <Upload className="h-6 w-6 text-green-600 group-hover:scale-110 transition-transform duration-200" />
                <span className="text-sm font-medium text-gray-700">Click to upload or drag and drop</span>
                <span className="text-xs text-muted-foreground">Quotes, price comparison, or supporting documents</span>
              </button>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedFiles.length} file(s) selected:</p>
                  <div className="space-y-1.5">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-green-50 border border-green-200">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-green-200 rounded transition-colors"
                        >
                          <X className="h-4 w-4 text-green-600" />
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
          <SectionHeader icon={ShoppingCart} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={ShoppingCart} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
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

        <div className="form-footer border-t bg-gray-50 py-4 px-1 flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Purchase Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PurchaseForm
