"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  EXPENSE_CATEGORIES,
  REIMBURSEMENT_CURRENCIES,
  ReimbursementPayloadSchema,
} from "./reimbursement.schema"
import { submitRequest, updateRequest, pushToServer, type EngineRequest } from "@/services/engineService"
import { createNewRequestNotifications } from "@/lib/notificationStore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Wallet, Upload, X, FileText, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import { CcEmailsField } from "@/components/ui/CcEmailsField"
import { SearchableSelect } from "@/components/ui/SearchableSelect"
import { getList, getManagerEmail } from "@/lib/companyDataStore"
import { filesToAttachments } from "@/lib/attachments"

const BRAND = "#d97706" // amber-600 — Finance brand color

type ReimbursementFormValues = z.infer<typeof ReimbursementPayloadSchema>

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

export function ReimbursementForm({ onCancel, editingRequest, isEditing }: { onCancel?: () => void; editingRequest?: EngineRequest | null; isEditing?: boolean }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([])
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [managers, setManagers] = useState<string[]>([])
  useEffect(() => {
    setManagers(getList("managers"))
  }, [])

  const { register, control, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<ReimbursementFormValues>({
    resolver: zodResolver(ReimbursementPayloadSchema),
    defaultValues: { currency: "EGP", ccEmails: [] },
  })

  useEffect(() => {
    if (isEditing && editingRequest?.payload) {
      const payload = editingRequest.payload as any
      reset({
        requestTitle: editingRequest.title || "",
        amount: payload.amount || 0,
        currency: payload.currency || "EGP",
        category: payload.category || "Other",
        dateOfExpense: payload.dateOfExpense || "",
        description: payload.description || "",
        directManager: payload.directManager || "",
        notes: payload.notes || "",
      })
    }
  }, [editingRequest, isEditing, reset])

  const handleCancel = onCancel ?? (() => router.push("/departments/finance/reimbursement"))

  const onSubmit = async (data: ReimbursementFormValues) => {
    if (!isEditing && !receiptFile) {
      setReceiptError("A receipt is required to submit a reimbursement request.")
      return
    }
    setReceiptError(null)

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
        updateRequest(editingRequest.id, {
          ...data,
          directManagerEmail: managerEmail ?? "",
        }, {
          title: data.requestTitle,
          requesterId: editingRequest.requesterId,
          requesterName: editingRequest.requesterName,
          requesterEmail: editingRequest.requesterEmail,
        })
      } else {
        // 1. Create request first (server-assigns the ID)
        const newReq = await submitRequest("finance_reimbursement", {
          ...data,
          directManagerEmail: managerEmail ?? "",
        } as any, {
          title: data.requestTitle,
          requesterId: session?.user?.id || "USR-001",
          requesterName: session?.user?.name || session?.user?.email || "Current User",
          requesterEmail: session?.user?.email || "user@si-ware.com",
        })

        // 2. Upload the receipt (required) + any additional files, then patch them in
        const filesToUpload = receiptFile ? [receiptFile, ...additionalFiles] : additionalFiles
        if (filesToUpload.length > 0) {
          const attachments = await filesToAttachments(filesToUpload, newReq.id)
          const receipt = receiptFile ? attachments[0] : undefined
          const additionalAttachments = receiptFile ? attachments.slice(1) : attachments
          const updated = updateRequest(newReq.id, { ...data, directManagerEmail: managerEmail ?? "", receipt, additionalAttachments } as any, { title: data.requestTitle })
          if (updated) {
            void pushToServer(updated)
          }
        }

        createNewRequestNotifications({
          requestId: newReq.id,
          requestTitle: newReq.title,
          module: "finance_reimbursement",
          requesterId: newReq.requesterId,
          requesterName: newReq.requesterName,
          requesterEmail: newReq.requesterEmail,
          ccEmails: data.ccEmails,
          managerEmail: managerEmail,
        })
      }
      redirectTo = "/departments/finance/reimbursement"
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
              <Input id="requestTitle" placeholder="e.g. Client Dinner — Cairo Trip" {...register("requestTitle")} className={cn(errors.requestTitle && "border-red-400")} />
              <FieldError message={errors.requestTitle?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Expense Details */}
        <Card>
          <SectionHeader icon={Wallet} title="Expense Details" subtitle="What are you being reimbursed for?" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount <span className="text-red-500">*</span></Label>
                <Input id="amount" type="number" min="0" step="0.01" placeholder="0.00" {...register("amount", { valueAsNumber: true })} className={cn(errors.amount && "border-red-400")} />
                <FieldError message={errors.amount?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency <span className="text-red-500">*</span></Label>
                <Controller
                  name="currency"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className={cn(errors.currency && "border-red-400")}>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent>
                        {REIMBURSEMENT_CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.currency?.message} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dateOfExpense">Date of Expense <span className="text-red-500">*</span></Label>
                <Input id="dateOfExpense" type="date" {...register("dateOfExpense")} className={cn(errors.dateOfExpense && "border-red-400")} />
                <FieldError message={errors.dateOfExpense?.message} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Expense Category <span className="text-red-500">*</span></Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(errors.category && "border-red-400")}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.category?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description / Justification <span className="text-red-500">*</span></Label>
              <Textarea id="description" placeholder="What was this expense for, and why was it necessary?" rows={4} {...register("description")} className={cn(errors.description && "border-red-400")} />
              <FieldError message={errors.description?.message} />
            </div>
          </CardContent>
        </Card>

        {/* Approval */}
        <Card>
          <SectionHeader icon={Wallet} title="Approval" subtitle="Your Direct Manager will be asked to approve this request" />
          <CardContent className="space-y-4">
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
              <p className="text-xs text-muted-foreground">The selected manager is automatically CC&apos;d and will receive an approval email.</p>
            </div>
          </CardContent>
        </Card>

        {/* Receipt */}
        <Card>
          <SectionHeader icon={Receipt} title="Receipt" subtitle="Upload proof of the expense" />
          <CardContent>
            <div className="space-y-3">
              <input
                id="receipt"
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setReceiptFile(e.target.files[0])
                    setReceiptError(null)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("receipt")?.click()}
                className={cn(
                  "w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2",
                  receiptFile ? "border-amber-400 bg-amber-50/60 hover:bg-amber-50" : "border-amber-300 hover:border-amber-500 hover:bg-amber-50"
                )}
              >
                {receiptFile ? (
                  <>
                    <FileText className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700">{receiptFile.name}</span>
                    <span className="text-xs text-amber-500">Click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-amber-600" />
                    <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                    <span className="text-xs text-muted-foreground">Receipt or proof of purchase (required)</span>
                  </>
                )}
              </button>
              <FieldError message={receiptError ?? undefined} />
            </div>
          </CardContent>
        </Card>

        {/* Additional Attachments */}
        <Card>
          <SectionHeader icon={Upload} title="Additional Attachments" subtitle="Any other supporting documents" />
          <CardContent>
            <div className="space-y-3">
              <input
                id="additional-attachments"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setAdditionalFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                }}
              />
              <button
                type="button"
                onClick={() => document.getElementById("additional-attachments")?.click()}
                className="w-full px-6 py-8 border-2 border-dashed rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <Upload className="h-6 w-6 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Click to browse files</span>
                <span className="text-xs text-muted-foreground">Optional supporting documents</span>
              </button>

              {additionalFiles.length > 0 && (
                <div className="space-y-1.5">
                  {additionalFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                      <span className="text-sm text-gray-700 truncate">{file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => setAdditionalFiles(additionalFiles.filter((_, i) => i !== idx))}
                        className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      >
                        <X className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <SectionHeader icon={Wallet} title="Additional Notes" subtitle="Any extra information" />
          <CardContent>
            <Textarea placeholder="Optional notes..." rows={3} {...register("notes")} />
          </CardContent>
        </Card>

        {/* CC Notifications */}
        <Card>
          <SectionHeader icon={Wallet} title="CC Notifications" subtitle="Additional recipients for email updates on this request" />
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
            {isSubmitting ? (isEditing ? "Updating..." : "Submitting...") : (isEditing ? "Update Request" : "Submit Reimbursement Request")}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ReimbursementForm
