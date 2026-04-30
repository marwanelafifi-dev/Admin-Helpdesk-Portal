"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ShippingRequestFormSchema,
  type ShippingRequestForm,
  CARRIERS,
  SUPPLIERS,
  COST_CENTERS,
} from "./shipping.schema"
import { shippingFormDefaults } from "./shipping.mock"
import { mockUsers } from "@/lib/mock-data"
import { requestsAPI } from "@/lib/apiClient"

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

function buildAttachmentPayload(files: StagedFile[]) {
  return files.map((sf) => ({
    id: `${sf.category}-${sf.id}`,
    name: sf.file.name,
    url: URL.createObjectURL(sf.file),
    mimeType: sf.file.type || "application/octet-stream",
    sizeBytes: sf.file.size,
    uploadedAt: new Date().toISOString(),
  }))
}

function hasRequiredDocs(files: StagedFile[]) {
  const hasAwb = files.some((f) => f.category === "awb")
  const hasInvoice = files.some((f) => f.category === "invoice")
  return hasAwb && hasInvoice
}

function mapApprovers(approvers: ShippingRequestForm["approvers"]) {
  const toPerson = (id: string) => {
    const u = mockUsers.find((x) => x.id === id)
    return u ? { userId: u.id, name: u.name, email: u.email } : undefined
  }
  return {
    directManager: toPerson(approvers.directManager)!,
    techManager: approvers.techManager.map((id) => toPerson(id)).filter(Boolean),
    pm: approvers.pm.map((id) => toPerson(id)).filter(Boolean),
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

export function ShippingForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter()
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [ccEmailInput, setCcEmailInput] = useState("")

  const { register, control, handleSubmit, watch, setValue, setError, clearErrors, formState: { errors, isSubmitting } } = useForm<ShippingRequestForm>({
    resolver: zodResolver(ShippingRequestFormSchema) as any,
    defaultValues: shippingFormDefaults as any,
  })

  const ccEmails = watch("ccEmails") ?? []
  const carrier = watch("carrier")

  const addStagedFiles = useCallback((newFiles: StagedFile[]) => setStagedFiles((prev) => [...prev, ...newFiles]), [])
  const removeStagedFile = useCallback((id: string) => setStagedFiles((prev) => prev.filter((f) => f.id !== id)), [])

  const onSubmit = async (data: ShippingRequestForm) => {
    if (!hasRequiredDocs(stagedFiles)) {
      setError("attachments", { type: "manual", message: "AWB and Commercial Invoice are both required." })
      return
    }
    clearErrors("attachments")

    try {
      const payload = {
        ...data,
        approvers: mapApprovers(data.approvers),
        attachments: buildAttachmentPayload(stagedFiles),
      }

      const created = await requestsAPI.create("shipping", {
        title: payload.title,
        description: payload.notes,
        payload: payload,
        requesterId: "USR-001", // TODO: Get from session
      })

      router.push(`/requests/${created.id}`)
      router.refresh()
    } catch (error) {
      console.error("Failed to create request:", error)
      setError("title", {
        type: "manual",
        message: "Failed to create request. Please try again.",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-4xl mx-auto pb-12">
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.supplier && "border-red-400")}><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{SUPPLIERS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              <FieldError message={errors.supplier?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Cost Center <span className="text-red-500">*</span></Label>
              <Controller name="costCenter" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.costCenter && "border-red-400")}><SelectValue placeholder="Select cost center" /></SelectTrigger>
                  <SelectContent>{COST_CENTERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
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
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className={cn((errors.approvers as any)?.directManager && "border-red-400")}><SelectValue placeholder="Select direct manager" /></SelectTrigger>
                <SelectContent>
                  {mockUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={cn(errors.carrier && "border-red-400")}><SelectValue placeholder="Select carrier" /></SelectTrigger>
                  <SelectContent>{CARRIERS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              <FieldError message={errors.carrier?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trackingNumber">Tracking Number <span className="text-red-500">*</span></Label>
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
            <Label htmlFor="description">Shipment Description</Label>
            <Textarea id="description" rows={2} {...register("description")} />
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
        <SectionHeader icon={Users} title="CC Notifications" subtitle="Notification contacts (informational only)" />
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Primary Mail (CC)</Label>
            <div className="flex gap-2 max-w-md">
              <Input type="email" placeholder="colleague@si-ware.com" value={ccEmailInput} onChange={(e) => setCcEmailInput(e.target.value)} />
              <Button type="button" variant="outline" size="icon" onClick={() => {
                const email = ccEmailInput.trim()
                if (!email || ccEmails.includes(email)) return
                setValue("ccEmails", [...ccEmails, email])
                setCcEmailInput("")
              }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {ccEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {ccEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="flex items-center gap-1.5 pr-1">
                    <Mail className="h-3 w-3" />
                    {email}
                    <button type="button" onClick={() => setValue("ccEmails", ccEmails.filter((e) => e !== email))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionHeader icon={Receipt} title="Attachments" subtitle="AWB and Commercial Invoice are required" />
        <CardContent>
          <div className="space-y-4">
            <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6 p-3 rounded-lg", (errors.attachments as { message?: string })?.message ? "bg-red-50 border border-red-200" : "")}>
              <FileUploadZone category="awb" label="AWB" icon={Plane} files={stagedFiles} onAdd={addStagedFiles} onRemove={removeStagedFile} required />
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

      <div className="sticky bottom-0 bg-white border-t py-4 px-1 flex items-center justify-between gap-3 -mx-1">
        <Button type="button" variant="ghost" onClick={() => onCancel?.()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} style={{ backgroundColor: BRAND }} className="text-white hover:opacity-90 min-w-[160px]">
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </form>
  )
}

export default ShippingForm
