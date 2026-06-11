"use client"

import { useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ShippingRequestFormSchema,
  type ShippingRequestForm,
} from "./shipping.schema"
import { shippingFormDefaults } from "./shipping.mock"
import { getList, addItem, getManagerEmail } from "@/lib/companyDataStore"
import { submitRequest, updateRequest, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import {
  FileText,
  Package,
  Calendar,
  Users,
  Upload,
  X,
  AlertCircle,
  Building2,
  Receipt,
  Plane,
  Mail,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const BRAND = "#1565C0"

interface StagedFile {
  id: string
  file: File
  category: "invoice" | "awb" | "other"
}

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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Convert staged files into a serializable attachment payload.
 * Stores each file as a base64 `data:` URL so it survives the request
 * being viewed by another user, in another tab, or after the original
 * upload's blob URL has been revoked.
 */
async function buildAttachmentPayload(files: StagedFile[]) {
  return Promise.all(files.map(async (sf) => ({
    id: `${sf.category}-${sf.id}`,
    name: sf.file.name,
    url: await fileToDataUrl(sf.file),
    mimeType: sf.file.type || "application/octet-stream",
    sizeBytes: sf.file.size,
    uploadedAt: new Date().toISOString(),
  })))
}

function hasRequiredDocs(files: StagedFile[]) {
  // Only the Commercial Invoice is required. AWB is optional.
  return files.some((f) => f.category === "invoice")
}

function mapApprovers(approvers: ShippingRequestForm["approvers"]) {
  // Resolve the manager name into {name, email} via Company Data so the
  // stored payload carries a real email — not an empty string.
  const toPerson = (id: string) => ({
    userId: id,
    name: id,
    email: getManagerEmail(id) ?? "",
  })
  return {
    directManager: toPerson(approvers.directManager),
    techManager: approvers.techManager.map(toPerson),
    pm: approvers.pm.map(toPerson),
  }
}

function FileUploadZone({
  category,
  label,
  icon: Icon,
  files,
  onAdd,
  onRemove,
  required,
}: {
  category: StagedFile["category"]
  label: string
  icon: React.ElementType
  files: StagedFile[]
  onAdd: (files: StagedFile[]) => void
  onRemove: (id: string) => void
  required?: boolean
}) {
  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    onAdd(
      Array.from(fileList).map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        category,
      }))
    )
  }

  const categoryFiles = files.filter((f) => f.category === category)

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4" style={{ color: BRAND }} />
        {label}
        {required && <span className="text-red-500">*</span>}
      </Label>
      <label className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed rounded-lg cursor-pointer border-gray-200 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50">
        <input type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Upload className="h-6 w-6 text-gray-400" />
        <p className="text-xs font-medium text-gray-600">Drop files here or browse</p>
      </label>
      {categoryFiles.length > 0 && (
        <ul className="space-y-1.5">
          {categoryFiles.map((sf) => (
            <li key={sf.id} className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100 text-sm">
              <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span className="flex-1 truncate text-xs font-medium">{sf.file.name}</span>
              <Badge variant="outline" className="text-[10px] flex-shrink-0">
                {sf.category === "invoice" ? "Commercial Invoice" : sf.category === "awb" ? "AWB" : "Other"}
              </Badge>
              <button type="button" onClick={() => onRemove(sf.id)} className="text-gray-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ShippingForm({ onCancel, editingRequest, isEditing, direction = "receiving" }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean; direction?: "sending" | "receiving" }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [costCenters, setCostCenters] = useState<string[]>([])
  const [carriers, setCarriers] = useState<string[]>([])
  const [managers, setManagers] = useState<{ id: string; name: string; email: string }[]>([])

  useEffect(() => {
    setSuppliers(getList("suppliers"))
    setCostCenters(getList("cost_centers"))
    setCarriers(getList("carriers"))
    setManagers(getList("managers").map((name) => ({ id: name, name, email: "" })))
  }, [])

  const { register, control, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting }, reset } = useForm<ShippingRequestForm>({
    resolver: zodResolver(ShippingRequestFormSchema) as any,
    defaultValues: shippingFormDefaults as any,
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        title: editingRequest.title || "",
        notes: payload.notes || "",
        supplier: payload.supplier || "",
        supplierName: payload.supplierName || "",
        poNumber: payload.poNumber || "",
        costCenter: payload.costCenter || "",
        carrier: payload.carrier || "",
        carrierName: payload.carrierName || "",
        trackingNumber: payload.trackingNumber || "",
        trackingLink: payload.trackingLink || "",
        description: payload.description || "",
        expectedPickupDate: payload.expectedPickupDate || "",
        expectedDeliveryDate: payload.expectedDeliveryDate || "",
        approvers: {
          directManager: payload.approvers?.directManager?.userId || "",
          techManager: payload.approvers?.techManager?.map((a: any) => a.userId) || [],
          pm: payload.approvers?.pm?.map((a: any) => a.userId) || [],
        },
        ccEmails: payload.ccEmails || [],
      })
    }
  }, [editingRequest, isEditing, reset])

  const ccEmails = watch("ccEmails") ?? []
  const carrier = watch("carrier")
  const supplier = watch("supplier")

  const addStagedFiles = useCallback((newFiles: StagedFile[]) => setStagedFiles((prev) => [...prev, ...newFiles]), [])
  const removeStagedFile = useCallback((id: string) => setStagedFiles((prev) => prev.filter((f) => f.id !== id)), [])

  const onSubmit = async (data: ShippingRequestForm) => {
    if (!isEditing && !hasRequiredDocs(stagedFiles)) {
      setError("attachments", { type: "manual", message: "Commercial Invoice is required." })
      return
    }
    clearErrors("attachments")

    // If the user picked "Other" and typed a new supplier, push the typed
    // value into the Company Data suppliers list so it's there next time —
    // and replace the form's `supplier` field with that name so the payload
    // we store doesn't keep "Other" as the supplier label.
    let resolvedSupplier = data.supplier
    if (data.supplier === "Other") {
      const typed = (data.supplierName ?? "").trim()
      if (typed) {
        addItem("suppliers", typed)
        setSuppliers(getList("suppliers"))
        resolvedSupplier = typed
      }
    }

    // Auto-CC the selected Direct Manager. Looks up their email in the
    // Company Data managers list and appends it to ccEmails (deduped, case
    // insensitive) so they receive every email notification for this request.
    const managerName = data.approvers?.directManager?.trim()
    const managerEmail = managerName ? getManagerEmail(managerName) : undefined
    const ccEmailsWithManager = (() => {
      const existing = data.ccEmails ?? []
      if (!managerEmail) return existing
      const lower = new Set(existing.map((e) => e.toLowerCase()))
      if (lower.has(managerEmail.toLowerCase())) return existing
      return [...existing, managerEmail]
    })()
    data.ccEmails = ccEmailsWithManager

    let redirectTo: string | null = null
    try {
      // Resolve attachments to data URLs BEFORE building the payload so the
      // stored object is fully serializable and survives across users/tabs.
      const attachmentsPayload = isEditing
        ? (editingRequest?.payload as any)?.attachments
        : await buildAttachmentPayload(stagedFiles)

      const payload = {
        ...data,
        supplier: resolvedSupplier,
        // Stamp the page's direction (sending / receiving) so list pages can
        // filter to their own bucket. When editing, keep whatever direction
        // was already on the request.
        direction: isEditing ? ((editingRequest?.payload as any)?.direction ?? direction) : direction,
        approvers: mapApprovers(data.approvers),
        attachments: attachmentsPayload,
      }

      if (isEditing && editingRequest) {
        updateRequest(editingRequest.id, payload, {
          title: data.title,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
        redirectTo = `/requests/${editingRequest.id}`
      } else {
        const created = submitRequest("shipping", payload, {
          title: data.title,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })
        createNewRequestNotifications({
          requestId: created.id,
          requestTitle: created.title,
          module: "shipping",
          requesterId: created.requesterId,
          requesterName: created.requesterName,
          requesterEmail: created.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: managerEmail,
        })
        redirectTo = `/requests/${created.id}`
      }
    } catch (error) {
      console.error(isEditing ? "Failed to update request:" : "Failed to create request:", error)
      setError("title", {
        type: "manual",
        message: isEditing ? "Failed to update request. Please try again." : "Failed to create request. Please try again.",
      })
    }

    // Navigate outside the try/catch — router.push() in Next.js 15 can throw
    // a navigation signal internally that would otherwise be swallowed as an error.
    if (redirectTo) {
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-4xl mx-auto">
      <Card>
        <SectionHeader icon={FileText} title="Request Details" subtitle="General information about this request" />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Request Title <span className="text-red-500">*</span></Label>
            <Input id="title" {...register("title")} className={cn(errors.title && "border-red-400")} />
            <FieldError message={errors.title?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...register("notes")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={Building2} title="Procurement" subtitle="Supplier, cost center, and purchase order details" />
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Supplier <span className="text-red-500">*</span></Label>
              <Controller name="supplier" control={control} render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={suppliers}
                  placeholder="Select supplier"
                  hasError={!!errors.supplier}
                  pinnedOption={{
                    value: "Other",
                    label: "Other",
                    caption: "Select if you need to add a new supplier",
                  }}
                />
              )} />
              <FieldError message={errors.supplier?.message} />
              {supplier === "Other" && (
                <div className="space-y-1.5 pt-1">
                  <Label htmlFor="supplierName">Supplier Name <span className="text-red-500">*</span></Label>
                  <Input id="supplierName" placeholder="Enter supplier name" {...register("supplierName")} className={cn(errors.supplierName && "border-red-400")} />
                  <FieldError message={(errors as any).supplierName?.message} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Cost Center <span className="text-red-500">*</span></Label>
              <Controller name="costCenter" control={control} render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={costCenters}
                  placeholder="Select cost center"
                  hasError={!!errors.costCenter}
                />
              )} />
              <FieldError message={errors.costCenter?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poNumber">PO Number <span className="text-red-500">*</span></Label>
              <Input id="poNumber" {...register("poNumber")} className={cn(errors.poNumber && "border-red-400")} />
              <FieldError message={errors.poNumber?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={Users} title="Approvers" subtitle="Select approval chain" />
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Direct Manager <span className="text-red-500">*</span></Label>
            <Controller name="approvers.directManager" control={control} render={({ field }) => (
              <SearchableSelect
                value={field.value}
                onChange={field.onChange}
                options={managers.map((u) => u.name)}
                placeholder="Select direct manager"
                hasError={!!(errors.approvers as any)?.directManager}
              />
            )} />
            <FieldError message={(errors.approvers as any)?.directManager?.message} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={Package} title="Shipment Details" subtitle="Carrier and tracking information" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Carrier <span className="text-red-500">*</span></Label>
              <Controller name="carrier" control={control} render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={carriers}
                  placeholder="Select carrier"
                  hasError={!!errors.carrier}
                />
              )} />
              <FieldError message={errors.carrier?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trackingNumber">Tracking Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="trackingNumber" {...register("trackingNumber")} className={cn(errors.trackingNumber && "border-red-400")} />
              <FieldError message={errors.trackingNumber?.message} />
            </div>
          </div>

          {carrier === "Other" && (
            <div className="space-y-1.5">
              <Label htmlFor="carrierName">Carrier Name <span className="text-red-500">*</span></Label>
              <Input id="carrierName" {...register("carrierName")} className={cn(errors.carrierName && "border-red-400")} />
              <FieldError message={errors.carrierName?.message} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description">Shipment Description <span className="text-red-500">*</span></Label>
            <Textarea id="description" rows={2} {...register("description")} className={cn(errors.description && "border-red-400")} />
            <FieldError message={errors.description?.message} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="expectedPickupDate" className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted-foreground" />Pickup Date</Label>
              <Input id="expectedPickupDate" type="date" {...register("expectedPickupDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedDeliveryDate" className="flex items-center gap-1.5">Delivery Date <span className="text-red-500">*</span></Label>
              <Input id="expectedDeliveryDate" type="date" {...register("expectedDeliveryDate")} className={cn(errors.expectedDeliveryDate && "border-red-400")} />
              <FieldError message={errors.expectedDeliveryDate?.message} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={Receipt} title="Attachments" subtitle="Commercial Invoice is required; AWB is optional" />
        <CardContent>
          <div className="space-y-4">
            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 p-3 rounded-lg", (errors.attachments as { message?: string })?.message ? "bg-red-50 border border-red-200" : "")}>
              <FileUploadZone category="awb" label="AWB" icon={Plane} files={stagedFiles} onAdd={addStagedFiles} onRemove={removeStagedFile} />
              <FileUploadZone category="invoice" label="Commercial Invoice" icon={FileText} files={stagedFiles} onAdd={addStagedFiles} onRemove={removeStagedFile} required />
            </div>
            <div className="mt-4">
              <FileUploadZone category="other" label="Other" icon={Upload} files={stagedFiles} onAdd={addStagedFiles} onRemove={removeStagedFile} />
            </div>
            {(errors.attachments as { message?: string })?.message && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm font-medium text-red-700">{(errors.attachments as { message?: string })?.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CC Notifications — last card before the submit footer */}
      <Card>
        <SectionHeader icon={Users} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
        <CardContent>
          <Controller
            name="ccEmails"
            control={control}
            render={({ field }) => (
              <CcEmailsField value={field.value ?? []} onChange={field.onChange} />
            )}
          />
        </CardContent>
      </Card>

      <div className="form-footer border-t bg-gray-50 py-4 px-1 flex items-center justify-between gap-3 -mx-1">
        <Button type="button" variant="ghost" onClick={() => onCancel?.()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit")}
        </Button>
      </div>
    </form>
  )
}

export default ShippingForm
